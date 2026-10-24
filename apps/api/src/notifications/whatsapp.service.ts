import { Injectable, Logger } from '@nestjs/common';
import { phoneDigits } from '@filialhub/shared';

export type SendResult = { status: 'SENT' | 'DRY_RUN' | 'FAILED'; error?: string };

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
      const res = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      });
      if (!res.ok) {
        const error = await res.text();
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
      const up = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: form,
      });
      if (!up.ok) throw new Error(await up.text());
      const { id } = (await up.json()) as { id: string };
      const type = kind === 'VOICE' ? 'audio' : 'video';
      const payload = type === 'audio' ? { id } : { id, caption: caption.replace(/<[^>]+>/g, '') };
      const res = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type, [type]: payload }),
      });
      if (!res.ok) throw new Error(await res.text());
      return { status: 'SENT' };
    } catch (e) {
      this.logger.warn(`Хатогӣ (media) → ${to}: ${(e as Error).message}`);
      return { status: 'FAILED', error: (e as Error).message.slice(0, 500) };
    }
  }
}
