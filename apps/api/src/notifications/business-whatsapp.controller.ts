import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Post, Put } from '@nestjs/common';
import { IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';
import type { BusinessWhatsApp } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature, Roles } from '../auth/decorators';
import { AuditService } from '../core/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { GreenApi, GreenPartner, greenWebhookBase, WhatsAppService } from './whatsapp.service';

export class BusinessWhatsAppDto {
  @IsString() @Matches(/^\d{6,20}$/, { message: 'idInstance — танҳо рақамҳо' })
  idInstance: string;

  /** Холӣ — токени пешина боқӣ мемонад */
  @IsOptional() @IsString() @MaxLength(200)
  apiToken?: string;

  @IsUrl({ require_protocol: true, protocols: ['https'] }, { message: 'apiUrl бояд бо https:// сар шавад' })
  apiUrl: string;

  @IsOptional() @IsString() @MaxLength(200)
  mediaUrl?: string;
}

/**
 * Профил → Бизнеси ман → «WhatsApp-и бизнес»: соҳиб рақами WhatsApp-и худи бизнесро (Green-API) пайваст мекунад.
 * Агар пайваст накунад — паёмҳо аз рақами умумии FilialHub мераванд. Токен ҳеҷ гоҳ ба браузер баргардонда намешавад.
 */
@Controller('auth/organization/whatsapp')
@Feature('profile')
@Roles('CHEF')
export class BusinessWhatsAppController {
  private readonly partner = new GreenPartner();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthUser): Promise<BusinessWhatsApp> {
    const o = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
    const client = new GreenApi({ id: o.waInstanceId, token: o.waApiToken, apiUrl: o.waApiUrl, mediaUrl: o.waMediaUrl });
    let state: string | null = null;
    let error: string | null = null;
    if (client.configured) {
      state = await this.whatsapp.stateOf(`org:${user.organizationId}`, client);
      if (state === 'error') error = 'Green-API ҷавоб надод — калидҳоро санҷед';
    }
    return {
      own: client.configured,
      idInstance: o.waInstanceId ?? '',
      apiUrl: o.waApiUrl ?? '',
      mediaUrl: o.waMediaUrl ?? '',
      tokenSet: !!o.waApiToken,
      state,
      error,
      platform: this.whatsapp.configured,
      autoAvailable: this.partner.configured,
    };
  }

  @Put()
  async save(@CurrentUser() user: AuthUser, @Body() dto: BusinessWhatsAppDto): Promise<BusinessWhatsApp> {
    const o = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
    const token = dto.apiToken?.trim() || o.waApiToken;
    if (!token) throw new BadRequestException('apiTokenInstance-ро нависед');
    const keys = { id: dto.idInstance.trim(), token, apiUrl: dto.apiUrl.trim(), mediaUrl: dto.mediaUrl?.trim() || dto.apiUrl.trim() };
    const client = new GreenApi(keys);
    // Пеш аз захира месанҷем, ки калидҳо дурустанд
    try {
      await client.state();
    } catch (e) {
      throw new BadRequestException(`Green-API калидҳоро қабул накард: ${(e as Error).message.slice(0, 200)}`);
    }
    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: { waInstanceId: keys.id, waApiToken: keys.token, waApiUrl: keys.apiUrl, waMediaUrl: keys.mediaUrl },
    });
    this.whatsapp.forgetOrg(user.organizationId);
    // Ҷавобҳо аз WhatsApp ба ҳамин бизнес
    const base = greenWebhookBase();
    if (base) await client.ensureWebhook(`${base}/api/whatsapp/webhook/greenapi/${user.organizationId}`).catch(() => {});
    this.audit.log(user, 'UPDATE', 'organization', user.organizationId, 'WhatsApp-и бизнес пайваст шуд');
    return this.get(user);
  }

  /**
   * Як тугма: сайт instance-и Green-API-ро худаш месозад (Partner API), калидҳоро захира мекунад ва webhook мегузорад.
   * Баъд соҳиб танҳо QR-ро скан мекунад.
   */
  @Post('auto')
  @HttpCode(200)
  async auto(@CurrentUser() user: AuthUser): Promise<BusinessWhatsApp> {
    if (!this.partner.configured) throw new BadRequestException('Пайвасти худкор дар сервер танзим нашудааст (GREENAPI_PARTNER_TOKEN)');
    const o = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
    if (o.waInstanceId && o.waApiToken) return this.get(user);
    let keys;
    try {
      keys = await this.partner.createInstance(`FilialHub #${o.id} ${o.name}`.slice(0, 100));
    } catch (e) {
      throw new BadRequestException(`Green-API instance насохт: ${(e as Error).message.slice(0, 200)}`);
    }
    await this.prisma.organization.update({
      where: { id: o.id },
      data: { waInstanceId: keys.id, waApiToken: keys.token, waApiUrl: keys.apiUrl, waMediaUrl: keys.mediaUrl },
    });
    this.whatsapp.forgetOrg(o.id);
    const base = greenWebhookBase();
    if (base) await new GreenApi(keys).ensureWebhook(`${base}/api/whatsapp/webhook/greenapi/${o.id}`).catch(() => {});
    this.audit.log(user, 'UPDATE', 'organization', o.id, 'WhatsApp-и бизнес: instance худкор сохта шуд');
    return this.get(user);
  }

  @Delete()
  @HttpCode(200)
  async remove(@CurrentUser() user: AuthUser): Promise<BusinessWhatsApp> {
    const o = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
    // Instance-и худкор сохташуда: аз WhatsApp мебароем ва онро нест мекунем (пардохт қатъ мешавад)
    if (this.partner.configured && o.waInstanceId && o.waApiToken) {
      const client = new GreenApi({ id: o.waInstanceId, token: o.waApiToken, apiUrl: o.waApiUrl, mediaUrl: o.waMediaUrl });
      await client.logout().catch(() => {});
      await this.partner.deleteInstance(o.waInstanceId).catch(() => {});
    }
    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: { waInstanceId: null, waApiToken: null, waApiUrl: null, waMediaUrl: null },
    });
    this.whatsapp.forgetOrg(user.organizationId);
    this.audit.log(user, 'UPDATE', 'organization', user.organizationId, 'WhatsApp-и бизнес ҷудо шуд');
    return this.get(user);
  }

  /** QR барои скан бо телефон (ҳар 20 сония нав мешавад) */
  @Get('qr')
  async qr(@CurrentUser() user: AuthUser) {
    const o = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
    const client = new GreenApi({ id: o.waInstanceId, token: o.waApiToken, apiUrl: o.waApiUrl, mediaUrl: o.waMediaUrl });
    if (!client.configured) throw new BadRequestException('Аввал калидҳои Green-API-ро захира кунед');
    // Хатои Green-API (масалан 429 — дархости зиёд) ҳамчун ҷавоб, на 500 — саҳифа QR-и пешинаро нигоҳ медорад
    return client.qr().catch((e: Error) => ({ type: 'error', message: e.message.slice(0, 200) }));
  }
}
