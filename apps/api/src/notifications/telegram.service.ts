import { createHash } from 'node:crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { SendResult } from './whatsapp.service';

export interface TgMessage {
  chat: { id: number };
  from?: { id: number; first_name?: string };
  text?: string;
  caption?: string;
  contact?: { phone_number: string; user_id?: number };
  voice?: { file_id: string; duration: number; mime_type?: string };
  audio?: { file_id: string; duration: number; mime_type?: string };
  video_note?: { file_id: string; duration: number };
  video?: { file_id: string; duration: number; mime_type?: string };
}

type UpdateHandler = (msg: TgMessage) => Promise<unknown>;

/**
 * Суроғаи оммавии API барои webhook: TELEGRAM_WEBHOOK_URL ё RENDER_EXTERNAL_URL (Render худаш медиҳад).
 * TELEGRAM_MODE=polling — ҳатман polling (масалан дар компютер).
 */
function webhookBase(): string | null {
  if (process.env.TELEGRAM_MODE?.trim() === 'polling') return null;
  const base = (process.env.TELEGRAM_WEBHOOK_URL ?? process.env.RENDER_EXTERNAL_URL)?.trim().replace(/\/+$/, '');
  return base?.startsWith('https://') ? base : null;
}

/**
 * Telegram Bot API. Дар сервер (Render) — webhook: Telegram худаш паёмро ба API мефиристад ва сервери «хобида»-ро бедор мекунад.
 * Дар компютер — long polling (сервери иловагӣ лозим нест).
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Telegram');
  private readonly token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  private running = false;
  private offset = 0;
  private handler?: UpdateHandler;
  botUsername: string | null = null;
  /** Ҳолати бот барои саҳифаи «Интегратсияҳо» */
  mode: 'webhook' | 'polling' | 'off' = 'off';
  lastError: string | null = null;

  get configured() {
    return !!this.token;
  }

  /** Сирри webhook аз токен (Telegram онро дар сарлавҳаи X-Telegram-Bot-Api-Secret-Token бармегардонад) */
  get webhookSecret(): string | null {
    return this.token ? createHash('sha256').update(`fh-webhook:${this.token}`).digest('hex').slice(0, 48) : null;
  }

  onUpdate(handler: UpdateHandler) {
    this.handler = handler;
  }

  /** Паёме, ки тавассути webhook омад */
  /**
   * Ҳолати webhook аз худи Telegram: оё паёмҳо ба сервер мерасанд.
   * Хатои охирин (масалан «Wrong response from the webhook: 403») ва шумораи паёмҳои дар навбатмонда.
   */
  async webhookStatus(): Promise<{ error: string | null; pending: number; url: string } | null> {
    if (!this.token || this.mode !== 'webhook') return null;
    try {
      const info = await this.call<{ url: string; pending_update_count: number; last_error_date?: number; last_error_message?: string }>('getWebhookInfo');
      // Хатои кӯҳна (зиёда аз 1 соат) — дигар аҳамият надорад
      const fresh = info.last_error_date && Date.now() / 1000 - info.last_error_date < 3600;
      return { error: fresh ? (info.last_error_message ?? null) : null, pending: info.pending_update_count, url: info.url };
    } catch (e) {
      return { error: (e as Error).message, pending: 0, url: '' };
    }
  }

  async handleUpdate(update: { message?: TgMessage }) {
    if (update.message && this.handler) await this.handler(update.message).catch((e) => this.logger.error(e));
  }

  async onModuleInit() {
    if (!this.token) {
      this.logger.log('TELEGRAM_BOT_TOKEN нест — бот хомӯш аст (паёмҳо dry-run)');
      return;
    }
    try {
      const me = await this.call<{ username: string }>('getMe');
      this.botUsername = me.username;
      const base = webhookBase();
      if (base) {
        await this.call('setWebhook', {
          url: `${base}/api/telegram/webhook`,
          secret_token: this.webhookSecret,
          allowed_updates: ['message'],
          drop_pending_updates: false,
        });
        this.mode = 'webhook';
      } else {
        // Агар пештар webhook гузошта шуда бошад, getUpdates 409 медиҳад — онро хомӯш мекунем.
        // Диққат: агар ҳамин бот дар Render бо webhook кор кунад, дар компютер токени ДИГАР (боти санҷишӣ) гузоред.
        await this.call('deleteWebhook', { drop_pending_updates: false });
        this.mode = 'polling';
      }
      await this.call('setMyCommands', {
        commands: [
          { command: 'today', description: 'Фурӯш ва фоидаи имрӯз' },
          { command: 'week', description: 'Омори ҳафта' },
          { command: 'month', description: 'Омори моҳ' },
          { command: 'branches', description: 'Рейтинги филиалҳо (шеф)' },
          { command: 'me', description: 'Маълумоти ман' },
          { command: 'help', description: 'Кӯмак' },
        ],
      });
      this.logger.log(`Бот @${me.username} пайваст шуд (${this.mode})`);
      if (this.mode === 'polling') {
        this.running = true;
        void this.poll();
      }
    } catch (e) {
      this.lastError = (e as Error).message;
      this.logger.error(`Пайваст нашуд: ${this.lastError}`);
    }
  }

  onModuleDestroy() {
    this.running = false;
  }

  async send(chatId: string, text: string, extra: Record<string, unknown> = {}): Promise<SendResult> {
    if (!this.token) {
      this.logger.log(`[dry-run] → ${chatId}: ${text.split('\n')[0]}`);
      return { status: 'DRY_RUN' };
    }
    try {
      // Telegram то 4096 аломат дар як паём қабул мекунад — матни дарозро қисм-қисм мефиристем.
      const parts = text.length > 4000 ? (text.match(/[\s\S]{1,4000}(?=\n|$)|[\s\S]{1,4000}/g) ?? [text]) : [text];
      for (const [i, part] of parts.entries()) {
        await this.call('sendMessage', { chat_id: chatId, text: part, parse_mode: 'HTML', ...(i === parts.length - 1 ? extra : {}) }).catch((e: Error) => {
          // HTML-и нодуруст (масалан тег бурида шуд) — ҳамон матнро бе формат мефиристем.
          if (!/can't parse entities/i.test(e.message)) throw e;
          return this.call('sendMessage', { chat_id: chatId, text: part.replace(/<[^>]+>/g, ''), ...(i === parts.length - 1 ? extra : {}) });
        });
      }
      return { status: 'SENT' };
    } catch (e) {
      this.lastError = (e as Error).message;
      return { status: 'FAILED', error: this.lastError };
    }
  }

  /**
   * Файли овоз/видео: овози OGG/MP3/M4A → sendVoice, видеои MP4 → sendVideoNote (мудаввар).
   * Дигар форматҳо (масалан WebM аз Chrome) ҳамчун файл (sendDocument) мераванд — дар Telegram кушода мешаванд.
   */
  async sendMedia(chatId: string, kind: 'VOICE' | 'VIDEO_NOTE', data: Uint8Array<ArrayBuffer>, mime: string, caption: string): Promise<SendResult> {
    if (!this.token) {
      this.logger.log(`[dry-run] → ${chatId}: ${kind} ${data.byteLength} байт`);
      return { status: 'DRY_RUN' };
    }
    const base = mime.split(';')[0];
    const ext = base.split('/')[1] ?? 'bin';
    const voiceOk = ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'].includes(base);
    const noteOk = base === 'video/mp4';
    const [method, field] =
      kind === 'VOICE' ? (voiceOk ? ['sendVoice', 'voice'] : ['sendDocument', 'document']) : noteOk ? ['sendVideoNote', 'video_note'] : ['sendDocument', 'document'];
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append(field, new Blob([data], { type: base }), `${kind === 'VOICE' ? 'voice' : 'video'}.${ext}`);
    // sendVideoNote caption надорад — ном пеш аз видео бо паёми алоҳида меравад.
    if (method === 'sendVideoNote') await this.send(chatId, caption);
    else {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, { method: 'POST', body: form });
      const json = (await res.json()) as { ok: boolean; description?: string };
      if (!json.ok) {
        // Видеои мудаввар бояд квадратӣ бошад; агар Telegram қабул накард — ҳамчун видеои оддӣ.
        if (method === 'sendVideoNote') return this.sendFile(chatId, 'sendVideo', 'video', data, base, `video.${ext}`);
        throw new Error(json.description ?? 'Telegram error');
      }
      return { status: 'SENT' };
    } catch (e) {
      return { status: 'FAILED', error: (e as Error).message };
    }
  }

  private async sendFile(chatId: string, method: string, field: string, data: Uint8Array<ArrayBuffer>, mime: string, name: string): Promise<SendResult> {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append(field, new Blob([data], { type: mime }), name);
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, { method: 'POST', body: form });
      const json = (await res.json()) as { ok: boolean; description?: string };
      if (!json.ok) throw new Error(json.description ?? 'Telegram error');
      return { status: 'SENT' };
    } catch (e) {
      return { status: 'FAILED', error: (e as Error).message };
    }
  }

  /** Файлро аз Telegram мегирад (то 20 МБ — маҳдудияти Bot API). */
  async download(fileId: string): Promise<{ data: Uint8Array<ArrayBuffer>; path: string }> {
    const file = await this.call<{ file_path: string }>('getFile', { file_id: fileId });
    const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${file.file_path}`);
    if (!res.ok) throw new Error(`Telegram file ${res.status}`);
    return { data: new Uint8Array(await res.arrayBuffer()), path: file.file_path };
  }

  private async poll() {
    while (this.running) {
      try {
        const updates = await this.call<{ update_id: number; message?: TgMessage }[]>('getUpdates', {
          offset: this.offset,
          timeout: 25,
          allowed_updates: ['message'],
        });
        for (const u of updates) {
          this.offset = u.update_id + 1;
          if (u.message && this.handler) {
            await this.handler(u.message).catch((e) => this.logger.error(e));
          }
        }
      } catch (e) {
        const message = (e as Error).message;
        // 409 — ҳамин бот дар сервери дигар (масалан Render ва компютер якҷоя) низ кор мекунад.
        this.logger.warn(/conflict/i.test(message) ? `Polling: бот дар ҷои дигар ҳам кор мекунад — танҳо як нусхаро гузоред (${message})` : `Polling: ${message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  /**
   * Дархост ба Bot API. Хатои муваққатӣ (шабака, 429 «too many requests», 5xx) то 3 маротиба такрор мешавад;
   * хатои доимӣ (масалан «chat not found», «bot was blocked») фавран бармегардад.
   */
  private async call<T = unknown>(method: string, body?: unknown, attempts = method === 'getUpdates' ? 1 : 3): Promise<T> {
    for (let i = 1; ; i++) {
      let wait = 1000 * i;
      try {
        const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body ?? {}),
          signal: AbortSignal.timeout(method === 'getUpdates' ? 40000 : 15000),
        });
        const json = (await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }))) as {
          ok: boolean;
          result: T;
          description?: string;
          parameters?: { retry_after?: number };
        };
        if (json.ok) return json.result;
        const temporary = res.status === 429 || res.status >= 500;
        if (!temporary || i >= attempts) throw new TelegramApiError(json.description ?? 'Telegram error');
        if (json.parameters?.retry_after) wait = Math.min(json.parameters.retry_after, 30) * 1000;
      } catch (e) {
        if (e instanceof TelegramApiError || i >= attempts) throw e;
      }
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/** Ҷавоби Bot API бо ok:false — такрор кардан фоида надорад */
class TelegramApiError extends Error {}
