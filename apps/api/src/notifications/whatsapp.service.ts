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
}
