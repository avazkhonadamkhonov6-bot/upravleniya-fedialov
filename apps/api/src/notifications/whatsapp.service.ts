import { createHash } from 'node:crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { phoneDigits } from '@filialhub/shared';
import { PrismaService } from '../prisma/prisma.service';

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
 * Green-API Partner: сайт барои ҳар бизнес instance-ро худаш месозад — соҳиб танҳо QR-ро скан мекунад.
 * GREENAPI_PARTNER_TOKEN (аз support@green-api.com) ва GREENAPI_PARTNER_URL (аз танзимоти консол).
 */
export class GreenPartner {
  private readonly token = process.env.GREENAPI_PARTNER_TOKEN?.trim();
  private readonly base = (process.env.GREENAPI_PARTNER_URL?.trim() || 'https://api.green-api.com').replace(/\/+$/, '');

  get configured() {
    return !!this.token;
  }

  private async post<T>(method: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.base}/partner/${method}/${this.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const json = (await res.json().catch(() => ({}))) as T & { code?: number; description?: string };
    // Green-API хатоҳоро бо HTTP 200 ва code/description бармегардонад
    if (!res.ok || (json.code && json.code >= 400)) throw new Error(json.description ?? `HTTP ${res.status}`);
    return json;
  }

  async createInstance(name: string, webhookUrl?: string, webhookUrlToken?: string): Promise<Required<GreenApiKeys>> {
    const r = await this.post<{ idInstance: number | string; apiTokenInstance: string; apiUrl: string; mediaUrl: string }>('createInstance', {
      name,
      ...(webhookUrl ? { webhookUrl, webhookUrlToken, incomingWebhook: 'yes', stateWebhook: 'yes', outgoingWebhook: 'no' } : {}),
    });
    if (!r.idInstance || !r.apiTokenInstance) throw new Error('Green-API instance насохт');
    return { id: String(r.idInstance), token: r.apiTokenInstance, apiUrl: r.apiUrl, mediaUrl: r.mediaUrl || r.apiUrl };
  }

  async deleteInstance(idInstance: string) {
    await this.post('deleteInstanceAccount', { idInstance: Number(idInstance) });
  }
}

/** Суроғаи оммавии API барои webhook-и Green-API (Render худаш RENDER_EXTERNAL_URL медиҳад) */
export function greenWebhookBase(): string | null {
  const base = (process.env.GREENAPI_WEBHOOK_BASE ?? process.env.RENDER_EXTERNAL_URL)?.trim().replace(/\/+$/, '');
  return base?.startsWith('https://') ? base : null;
}

/** Рақами Тоҷикистон бе коди кишвар (9 рақам) → бо 992 */
export function waNumber(phone: string): string {
  const d = phoneDigits(phone);
  return d.length === 9 ? `992${d}` : d;
}

/**
 * Green-API (green-api.com): WhatsApp-и оддии телефон бо скани QR пайваст мешавад — Facebook лозим нест.
 * GREENAPI_ID_INSTANCE, GREENAPI_API_TOKEN ва GREENAPI_API_URL (аз консоли Green-API, масалан https://7103.api.greenapi.com).
 */
export interface GreenApiKeys {
  id?: string | null;
  token?: string | null;
  apiUrl?: string | null;
  mediaUrl?: string | null;
}

export class GreenApi {
  private readonly logger = new Logger('GreenAPI');
  readonly id: string | undefined;
  private readonly token: string | undefined;
  private readonly base: string;
  /** Барои фиристодани файл (овоз/видео); пешфарз — ҳамон суроғаи API */
  private readonly mediaBase: string;

  /** Бе калидҳо — рақами умумии FilialHub аз .env; бо калидҳо — рақами худи бизнес */
  constructor(keys?: GreenApiKeys) {
    const k = keys ?? {
      id: process.env.GREENAPI_ID_INSTANCE,
      token: process.env.GREENAPI_API_TOKEN,
      apiUrl: process.env.GREENAPI_API_URL,
      mediaUrl: process.env.GREENAPI_MEDIA_URL,
    };
    this.id = k.id?.trim() || undefined;
    this.token = k.token?.trim() || undefined;
    this.base = (k.apiUrl?.trim() || 'https://api.green-api.com').replace(/\/+$/, '');
    this.mediaBase = (k.mediaUrl?.trim() || this.base).replace(/\/+$/, '');
  }

  /** QR барои пайваст кардани телефон: { type: 'qrCode' | 'alreadyLogged' | 'error' | …, message } */
  async qr(): Promise<{ type: string; message: string }> {
    return this.call<{ type: string; message: string }>('qr', undefined, 'GET', true);
  }

  /** Баромадан аз WhatsApp (то рақами дигарро пайваст кунед) */
  async logout() {
    return this.call('logout', undefined, 'GET');
  }

  get configured() {
    return !!(this.id && this.token);
  }

  /** Сирри webhook аз токен — Green-API онро дар сарлавҳаи Authorization: Bearer … мефиристад */
  get webhookSecret(): string | null {
    return this.token ? createHash('sha256').update(`fh-greenapi:${this.token}`).digest('hex').slice(0, 40) : null;
  }

  private url(method: string, media = false) {
    return `${media ? this.mediaBase : this.base}/waInstance${this.id}/${method}/${this.token}`;
  }

  /** Дархост; хатои муваққатӣ (шабака, 429, 5xx) то 3 маротиба такрор мешавад */
  // quick — як кӯшиш, то 12 сония (санҷиши ҳолат ва QR, то саҳифа интизор намонад)
  async call<T = unknown>(method: string, body?: unknown, httpMethod: 'GET' | 'POST' = 'POST', quick = false): Promise<T> {
    const attempts = quick ? 1 : 3;
    for (let i = 1; ; i++) {
      try {
        const res = await fetch(this.url(method), {
          method: httpMethod,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(quick ? 12000 : 20000),
        });
        const text = await res.text();
        if (res.ok) return (text ? JSON.parse(text) : {}) as T;
        if ((res.status !== 429 && res.status < 500) || i >= attempts) throw new GreenApiError(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      } catch (e) {
        if (e instanceof GreenApiError || i >= attempts) throw e;
      }
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }

  async sendText(phone: string, text: string): Promise<SendResult> {
    try {
      await this.call('sendMessage', { chatId: `${waNumber(phone)}@c.us`, message: text.slice(0, 20000), linkPreview: false });
      return { status: 'SENT' };
    } catch (e) {
      return { status: 'FAILED', error: (e as Error).message.slice(0, 500) };
    }
  }

  async sendFile(phone: string, data: Uint8Array<ArrayBuffer>, mime: string, name: string, caption: string): Promise<SendResult> {
    try {
      const form = new FormData();
      form.append('chatId', `${waNumber(phone)}@c.us`);
      form.append('file', new Blob([data], { type: mime }), name);
      if (caption) form.append('caption', caption);
      const res = await fetch(this.url('sendFileByUpload', true), { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return { status: 'SENT' };
    } catch (e) {
      return { status: 'FAILED', error: (e as Error).message.slice(0, 500) };
    }
  }

  /** Ҳолати WhatsApp: authorized — пайваст; notAuthorized — QR-ро скан кунед */
  async state(): Promise<string> {
    const r = await this.call<{ stateInstance: string }>('getStateInstance', undefined, 'GET', true);
    return r.stateInstance;
  }

  /** Webhook-ро ба сервери мо мегузорад (танҳо агар фарқ кунад — setSettings инстансро аз нав сар мекунад) */
  async ensureWebhook(webhookUrl: string) {
    const cur = await this.call<{ webhookUrl?: string; webhookUrlToken?: string; incomingWebhook?: string }>('getSettings', undefined, 'GET');
    const token = `Bearer ${this.webhookSecret}`;
    if (cur.webhookUrl === webhookUrl && cur.incomingWebhook === 'yes' && cur.webhookUrlToken === token) return false;
    await this.call('setSettings', { webhookUrl, webhookUrlToken: token, incomingWebhook: 'yes', outgoingWebhook: 'no', outgoingMessageWebhook: 'no', outgoingAPIMessageWebhook: 'no', stateWebhook: 'yes' });
    this.logger.log(`Webhook гузошта шуд: ${webhookUrl}`);
    return true;
  }
}

class GreenApiError extends Error {}

/**
 * WhatsApp: Green-API (агар GREENAPI_* бошад) ё WhatsApp Cloud API (Meta). Бе калид паём фиристода намешавад, танҳо дар лог сабт мешавад.
 * Эзоҳ: Meta матни озодро танҳо дар давоми 24 соат пас аз паёми охирини корбар иҷозат медиҳад;
 * берун аз он бояд template-и тасдиқшуда истифода шавад.
 */
@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger('WhatsApp');
  /** Green-API — WhatsApp-и оддӣ бо QR, бе Facebook */
  readonly green = new GreenApi();
  /** Ҳолати Green-API: authorized | notAuthorized | … (барои саҳифаи «Интегратсияҳо») */
  greenState: string | null = null;
  private readonly orgClients = new Map<number, { at: number; client: GreenApi | null }>();

  constructor(private readonly prisma: PrismaService) {}
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
    return this.green.configured || !!(this.token && this.phoneNumberId);
  }

  /** Кадом роҳ: greenapi | meta | null */
  get provider(): 'greenapi' | 'meta' | null {
    return this.green.configured ? 'greenapi' : this.token && this.phoneNumberId ? 'meta' : null;
  }

  async onModuleInit() {
    if (!this.green.configured) return;
    // Суроғаи оммавии API барои webhook: Render худаш RENDER_EXTERNAL_URL медиҳад
    const base = greenWebhookBase();
    try {
      this.greenState = await this.green.state();
      this.logger.log(`Green-API: ${this.greenState}`);
      if (base?.startsWith('https://')) await this.green.ensureWebhook(`${base}/api/whatsapp/webhook/greenapi`);
      else this.logger.warn('Green-API: суроғаи оммавӣ нест — ҷавобҳо аз WhatsApp ба сайт намеоянд (GREENAPI_WEBHOOK_BASE)');
    } catch (e) {
      this.lastError = `Green-API: ${(e as Error).message}`;
      this.logger.error(this.lastError);
    }
  }

  /** Ҳолати навтарини Green-API (барои саҳифаи «Интегратсияҳо») */
  async refreshGreenState() {
    if (!this.green.configured) return null;
    try {
      this.greenState = await this.green.state();
    } catch (e) {
      this.greenState = 'error';
      this.lastError = `Green-API: ${(e as Error).message}`;
    }
    return this.greenState;
  }

  /**
   * Green-API-и бизнес (агар рақами худашро пайваст карда бошад), вагарна рақами умумии FilialHub.
   * Калидҳои бизнес 60 сония дар хотира нигоҳ дошта мешаванд.
   */
  async greenFor(orgId?: number | null): Promise<GreenApi | null> {
    if (orgId) {
      const hit = this.orgClients.get(orgId);
      let client = hit && Date.now() - hit.at < 60_000 ? hit.client : undefined;
      if (client === undefined) {
        const o = await this.prisma.organization.findUnique({
          where: { id: orgId },
          select: { waInstanceId: true, waApiToken: true, waApiUrl: true, waMediaUrl: true },
        });
        const c = o ? new GreenApi({ id: o.waInstanceId, token: o.waApiToken, apiUrl: o.waApiUrl, mediaUrl: o.waMediaUrl }) : null;
        client = c?.configured ? c : null;
        this.orgClients.set(orgId, { at: Date.now(), client });
      }
      if (client) return client;
    }
    return this.green.configured ? this.green : null;
  }

  /** Пас аз ивази калидҳои бизнес */
  forgetOrg(orgId: number) {
    this.orgClients.delete(orgId);
  }

  async send(phone: string, text: string, orgId?: number | null): Promise<SendResult> {
    const to = phoneDigits(phone);
    const green = await this.greenFor(orgId);
    if (!green && !this.configured) {
      this.logger.log(`[dry-run] → ${to}: ${text.split('\n')[0]}`);
      return { status: 'DRY_RUN' };
    }
    if (green) {
      const g = await green.sendText(phone, text);
      if (g.error) {
        this.lastError = g.error;
        this.logger.warn(`Хатогӣ → ${to}: ${g.error}`);
      }
      return g;
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
  async sendMedia(
    phone: string,
    kind: 'VOICE' | 'VIDEO_NOTE',
    data: Uint8Array<ArrayBuffer>,
    mime: string,
    caption: string,
    orgId?: number | null,
  ): Promise<SendResult> {
    const base = mime.split(';')[0];
    const green = await this.greenFor(orgId);
    // Green-API ҳар файлро қабул мекунад; Meta — танҳо ин форматҳо
    const supported =
      !!green ||
      (kind === 'VOICE' ? ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr'].includes(base) : ['video/mp4', 'video/3gpp'].includes(base));
    if (!supported) return this.send(phone, `${caption}
${kind === 'VOICE' ? '🎤 Паёми овозӣ' : '🎥 Видеопаём'} — дар FilialHub гӯш кунед.`, orgId);
    const to = phoneDigits(phone);
    if (!green && !this.configured) {
      this.logger.log(`[dry-run] → ${to}: ${kind} ${data.byteLength} байт`);
      return { status: 'DRY_RUN' };
    }
    if (green) {
      const ext = base.split('/')[1] ?? 'bin';
      const g = await green.sendFile(phone, data, base, `${kind === 'VOICE' ? 'voice' : 'video'}.${ext}`, caption);
      if (g.status === 'SENT') return g;
      // Файл нарафт — ақаллан хабар, ки паём дар FilialHub аст
      this.lastError = g.error ?? null;
      return this.send(phone, `${caption}\n${kind === 'VOICE' ? '🎤 Паёми овозӣ' : '🎥 Видеопаём'} — дар FilialHub гӯш кунед.`, orgId);
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
