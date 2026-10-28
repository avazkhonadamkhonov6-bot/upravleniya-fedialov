import { Injectable, Logger } from '@nestjs/common';
import { phoneDigits } from '@filialhub/shared';

export type SendResult = { status: 'SENT' | 'DRY_RUN' | 'FAILED'; error?: string };

const GRAPH = 'https://graph.facebook.com/v21.0';

/** Матни HTML-и Telegram → формати WhatsApp: <b> → *ғафс*, <i> → _хобида_, бе тегҳо ва бе &amp;. */
export function htmlToWhatsApp(html: string): string {
  return html
    .replace(/<\/?b>/g, '*')
    .replace(/<\/?i>/g, '_')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * WhatsApp Cloud API (Meta). Бе WHATSAPP_TOKEN паём фиристода намешавад, танҳо дар лог сабт мешавад.
 * Эзоҳ: Meta матни озодро танҳо дар давоми 24 соат пас аз паёми охирини корбар иҷозат медиҳад;
 * берун аз он бояд template-и тасдиқшуда истифода шавад.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger('WhatsApp');
  private readonly token = process.env.WHATSAPP_TOKEN?.trim();
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  /**
   * Шаблони тасдиқшуда дар Meta (WhatsApp Manager → Message templates) бо як тағйирёбанда: матн «{{1}}».
   * Вақте ки 24 соат аз паёми охирини корбар гузашт, паём бо ҳамин шаблон меравад.
   */
  readonly template = process.env.WHATSAPP_TEMPLATE?.trim() || null;
  private readonly templateLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || 'ru';
  lastError: string | null = null;

  get configured() {
    return !!(this.token && this.phoneNumberId);
  }

  async send(phone: string, text: string): Promise<SendResult> {
    const to = phoneDigits(phone);
    if (!this.configured) {
      this.logger.log(`[dry-run] → ${to}: ${text.split('\n')[0]}`);
      return { status: 'DRY_RUN' };
    }
    let r = await this.post({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text.slice(0, 4096) } });
    // 131047: 24 соат аз паёми охирини корбар гузашт — Meta матни озодро намегузорад, танҳо шаблон.
    if (r.error?.includes('131047')) {
      if (this.template) {
        // Тағйирёбандаи шаблон сатри нав ва зиёда аз 4 фосила қабул намекунад.
        const param = text.replace(/\s*\n+\s*/g, ' · ').replace(/\s{4,}/g, '   ').slice(0, 1000);
        r = await this.post({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: this.template, language: { code: this.templateLang }, components: [{ type: 'body', parameters: [{ type: 'text', text: param }] }] },
        });
      } else {
        r.error = `24 соат гузашт: корбар аввал бояд ба WhatsApp-и ширкат нависад ё WHATSAPP_TEMPLATE гузоред. ${r.error}`;
      }
    }
    if (r.error) {
      this.lastError = r.error.slice(0, 500);
      this.logger.warn(`Хатогӣ → ${to}: ${r.error}`);
      return { status: 'FAILED', error: this.lastError };
    }
    return { status: 'SENT' };
  }

  /** POST ба /messages; хатои муваққатӣ (шабака, 429, 5xx) то 3 маротиба такрор мешавад */
  private async post(body: unknown): Promise<{ error?: string }> {
    for (let i = 1; ; i++) {
      try {
        const res = await fetch(`${GRAPH}/${this.phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) return {};
        const error = await res.text();
        if ((res.status !== 429 && res.status < 500) || i >= 3) return { error };
      } catch (e) {
        if (i >= 3) return { error: (e as Error).message };
      }
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }

  /**
   * Овоз/видео: аввал файл ба Meta бор мешавад (/media), баъд паёми audio/video.
   * WhatsApp WebM-ро қабул намекунад — он гоҳ танҳо матн меравад, ки паём дар FilialHub аст.
   */
  async sendMedia(phone: string, kind: 'VOICE' | 'VIDEO_NOTE', data: Uint8Array<ArrayBuffer>, mime: string, caption: string): Promise<SendResult> {
    const base = mime.split(';')[0];
    const supported = kind === 'VOICE'
        ? ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr'].includes(base)
        : ['video/mp4', 'video/3gpp'].includes(base);
    if (!supported) return this.send(phone, `${caption}
${kind === 'VOICE' ? '🎤 Паёми овозӣ' : '🎥 Видеопаём'} — дар FilialHub гӯш кунед.`);
    const to = phoneDigits(phone);
    if (!this.configured) {
      this.logger.log(`[dry-run] → ${to}: ${kind} ${data.byteLength} байт`);
      return { status: 'DRY_RUN' };
    }
    try {
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', base);
      form.append('file', new Blob([data], { type: base }), `media.${base.split('/')[1]}`);
      const up = await fetch(`${GRAPH}/${this.phoneNumberId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: form,
      });
      if (!up.ok) throw new Error(await up.text());
      const { id } = (await up.json()) as { id: string };
      const type = kind === 'VOICE' ? 'audio' : 'video';
      const payload = type === 'audio' ? { id } : { id, caption: caption.replace(/<[^>]+>/g, '') };
      const res = await fetch(`${GRAPH}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type, [type]: payload }),
      });
      if (!res.ok) throw new Error(await res.text());
      // Ба аудио caption илова намешавад — номи фиристандаро бо паёми алоҳида мефиристем.
      if (type === 'audio') await this.send(phone, caption);
      return { status: 'SENT' };
    } catch (e) {
      this.logger.warn(`Хатогӣ (media) → ${to}: ${(e as Error).message}`);
      return { status: 'FAILED', error: (e as Error).message.slice(0, 500) };
    }
  }

  /** Файли овоз/видеоро, ки корманд ба WhatsApp фиристод, аз Meta мегирад (аввал URL, баъд худи файл). */
  async download(mediaId: string): Promise<{ data: Uint8Array<ArrayBuffer>; mime: string }> {
    const auth = { Authorization: `Bearer ${this.token}` };
    const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: auth });
    if (!meta.ok) throw new Error(await meta.text());
    const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
    const file = await fetch(url, { headers: auth });
    if (!file.ok) throw new Error(`WhatsApp media ${file.status}`);
    return { data: new Uint8Array(await file.arrayBuffer()), mime: mime_type.split(';')[0] };
  }
}
