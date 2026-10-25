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

  get configured() {
    return !!(this.token && this.phoneNumberId);
  }

  async send(phone: string, text: string): Promise<SendResult> {
    const to = phoneDigits(phone);
    if (!this.configured) {
      this.logger.log(`[dry-run] → ${to}: ${text.split('\n')[0]}`);
      return { status: 'DRY_RUN' };
    }
    try {
      const res = await fetch(`${GRAPH}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text.slice(0, 4096) } }),
      });
      if (!res.ok) {
        let error = await res.text();
        // 131047: 24 соат аз паёми охирини корманд гузашт — Meta матни озодро намегузорад.
        if (error.includes('131047')) error = `24 соат гузашт: корманд аввал бояд ба WhatsApp-и ширкат нависад (ё template лозим). ${error}`;
        this.logger.warn(`Хатогӣ → ${to}: ${error}`);
        return { status: 'FAILED', error: error.slice(0, 500) };
      }
      return { status: 'SENT' };
    } catch (e) {
      return { status: 'FAILED', error: (e as Error).message };
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
