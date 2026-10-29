import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Put } from '@nestjs/common';
import { IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';
import type { BusinessWhatsApp } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature, Roles } from '../auth/decorators';
import { AuditService } from '../core/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { GreenApi, greenWebhookBase, WhatsAppService } from './whatsapp.service';

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
      try {
        state = await client.state();
      } catch (e) {
        error = (e as Error).message;
      }
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

  @Delete()
  @HttpCode(200)
  async remove(@CurrentUser() user: AuthUser): Promise<BusinessWhatsApp> {
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
    return client.qr();
  }
}
