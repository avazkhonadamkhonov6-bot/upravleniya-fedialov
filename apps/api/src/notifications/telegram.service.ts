import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { SendResult } from './whatsapp.service';

export interface TgMessage {
  chat: { id: number };
  from?: { first_name?: string };
  text?: string;
  contact?: { phone_number: string; user_id?: number };
}

type UpdateHandler = (msg: TgMessage) => Promise<unknown>;

/** Telegram Bot API бо long polling — сервери иловагӣ ё webhook лозим нест. */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Telegram');
  private readonly token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  private running = false;
  private offset = 0;
  private handler?: UpdateHandler;
  botUsername: string | null = null;

  get configured() {
    return !!this.token;
  }

  onUpdate(handler: UpdateHandler) {
    this.handler = handler;
  }

  async onModuleInit() {
    if (!this.token) {
      this.logger.log('TELEGRAM_BOT_TOKEN нест — бот хомӯш аст (паёмҳо dry-run)');
      return;
    }
    try {
      const me = await this.call<{ username: string }>('getMe');
      this.botUsername = me.username;
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
      this.logger.log(`Бот @${me.username} пайваст шуд`);
      this.running = true;
      void this.poll();
    } catch (e) {
      this.logger.error(`Пайваст нашуд: ${(e as Error).message}`);
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
      await this.call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
      return { status: 'SENT' };
    } catch (e) {
      return { status: 'FAILED', error: (e as Error).message };
    }
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
        this.logger.warn(`Polling: ${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  private async call<T = unknown>(method: string, body?: unknown): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const json = (await res.json()) as { ok: boolean; result: T; description?: string };
    if (!json.ok) throw new Error(json.description ?? 'Telegram error');
    return json.result;
  }
}
