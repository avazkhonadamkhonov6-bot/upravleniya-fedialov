import Anthropic from '@anthropic-ai/sdk';
import { BadRequestException, Body, Controller, Injectable, Logger, Module, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsIn, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import type { BranchRank, Period, PeriodStats, ProductRank } from '@filialhub/shared';
import { AuthUser, CurrentUser, Feature, Roles } from '../auth/decorators';
import { branchIdList } from '../common/access';
import { localDay, periodStart, startOfLocalDay } from '../common/time';
import { branchesReply, cashReply, debtsReply, helpReply, lateReply, parseQuestion, productsReply, salesReply, stockReply } from './simple-assistant';
import { AiInsightsService } from '../notifications/ai-insights.service';
import { PrismaService } from '../prisma/prisma.service';
import { StatsModule } from '../stats/stats.module';
import { StatsService } from '../stats/stats.service';

class ChatTurnDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString() @MinLength(1) @MaxLength(4000)
  content: string;
}

export class AssistantDto {
  @ValidateNested({ each: true }) @Type(() => ChatTurnDto) @ArrayMinSize(1) @ArrayMaxSize(30)
  messages: ChatTurnDto[];
}

/** Ҳадди қадамҳои асбоб дар як ҷавоб — то AI бепоён давр назанад */
const MAX_STEPS = 6;

const PERIOD = { type: 'string', enum: ['day', 'week', 'month'], description: 'day — имрӯз, week — ҳафтаи ҷорӣ (аз душанбе), month — моҳи ҷорӣ' };
const BRANCH = { type: ['integer', 'null'], description: 'ID-и филиал аз рӯйхати филиалҳо; null — ҳамаи филиалҳо' };
const DATE = { type: ['string', 'null'], description: 'Сана YYYY-MM-DD; null — имрӯз' };

const tool = (name: string, description: string, properties: Record<string, object>): Anthropic.Beta.BetaTool => ({
  name,
  description,
  strict: true,
  input_schema: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
});

const TOOLS: Anthropic.Beta.BetaTool[] = [
  tool('sales_stats', 'Фурӯш, фоида, хароҷот, шумораи фармоиш ва чеки миёна барои давра', { period: PERIOD, branch_id: BRANCH }),
  tool('branch_ranking', 'Муқоисаи филиалҳо аз рӯи фурӯш ва фоида барои давра', { period: PERIOD }),
  tool('top_products', 'Молҳои аз ҳама бештар фурӯхташуда барои давра', { period: PERIOD, branch_id: BRANCH }),
  tool('late_staff', 'Кормандоне, ки дар рӯз аз смена дер омаданд ё наомаданд', { date: DATE }),
  tool('debtors', 'Мизоҷони қарздор: маблағ, мӯҳлат, чанд рӯз гузашт', {
    overdue_only: { type: 'boolean', description: 'true — танҳо қарзҳои мӯҳлатгузашта' },
  }),
  tool('stock_forecast', 'Молҳое, ки кам монданд ё то 7 рӯз тамом мешаванд, бо миқдори пешниҳодии фармоиш', { branch_id: BRANCH }),
  tool('cash_closings', 'Пӯшидани касса дар рӯз: интизор, ҳисобшуда ва фарқ барои ҳар кассир', { date: DATE }),
];

/**
 * Ёрдамчии чат барои шеф ва менеҷер: савол бо забони одӣ → Claude асбобҳоро меҷӯяд → ҷавоби кӯтоҳ.
 * Ҳар асбоб бо branchIdList(user) маҳдуд аст: менеҷер танҳо филиали худ, шеф танҳо ширкати худро мебинад.
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger('Assistant');
  private readonly client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  private readonly model = process.env.AI_ASSISTANT_MODEL || 'claude-opus-5-5';

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly insights: AiInsightsService,
  ) {}

  async chat(user: AuthUser, history: ChatTurnDto[]): Promise<{ reply: string; ai: boolean }> {
    if (history[0].role !== 'user' || history[history.length - 1].role !== 'user') throw new BadRequestException('Паём бояд аз корбар бошад');
    const branches = await this.prisma.branch.findMany({ where: { id: { in: branchIdList(user) } }, select: { id: true, name: true } });
    // Бе калиди Claude — ёрдамчии ройгон аз рӯи калимаҳо (бо ҳамон асбобҳо ва ҳуқуқҳо)
    if (!this.client) return { reply: await this.simple(user, history[history.length - 1].content, branches), ai: false };
    return { reply: await this.claude(user, history, branches), ai: true };
  }

  private async simple(user: AuthUser, question: string, branches: { id: number; name: string }[]): Promise<string> {
    const q = parseQuestion(question, branches);
    // Менеҷер як филиал дорад — ҷавоб номи ҳамонро нишон медиҳад, на «ҳамаи филиалҳо»
    const branchName = q.branchId !== null ? (branches.find((b) => b.id === q.branchId)?.name ?? null) : branches.length === 1 ? branches[0].name : null;
    const period: Period = q.when === 'yesterday' ? 'day' : q.when;
    const date = q.when === 'yesterday' ? localDay(startOfLocalDay(new Date(), -1)) : null;
    const input = { period, branch_id: q.branchId, date, overdue_only: q.overdueOnly };
    switch (q.intent) {
      case 'sales': {
        // «Дирӯз» — асбоби sales_stats танҳо давраҳои ҷорӣ дорад, пас рост аз StatsService
        if (q.when === 'yesterday') {
          const ids = branchIdList(user, q.branchId ?? undefined);
          const stats = await this.stats.periodStats({ in: ids }, startOfLocalDay(new Date(), -1), startOfLocalDay());
          return salesReply(stats, q.when, branchName, q.lang);
        }
        return salesReply((await this.run(user, 'sales_stats', input)) as PeriodStats, q.when, branchName, q.lang);
      }
      case 'branches':
        return branchesReply((await this.run(user, 'branch_ranking', input)) as BranchRank[], q.when === 'yesterday' ? 'day' : q.when, q.lang);
      case 'products':
        return productsReply((await this.run(user, 'top_products', input)) as ProductRank[], q.when === 'yesterday' ? 'day' : q.when, q.lang);
      case 'late':
        return lateReply((await this.run(user, 'late_staff', input)) as Parameters<typeof lateReply>[0], q.when, q.lang);
      case 'debts':
        return debtsReply((await this.run(user, 'debtors', input)) as Parameters<typeof debtsReply>[0], q.overdueOnly, q.lang);
      case 'stock':
        return stockReply((await this.run(user, 'stock_forecast', input)) as Parameters<typeof stockReply>[0], q.lang);
      case 'cash':
        return cashReply((await this.run(user, 'cash_closings', input)) as Parameters<typeof cashReply>[0], q.when, q.lang);
      default:
        return helpReply(q.lang);
    }
  }

  private async claude(user: AuthUser, history: ChatTurnDto[], branches: { id: number; name: string }[]): Promise<string> {
    const system = `Ту ёрдамчии AI-и FilialHub барои ${user.role === 'CHEF' ? 'соҳиби бизнес' : 'менеҷери филиал'} ҳастӣ (${user.fullName}).
Ба саволҳо дар бораи фурӯш, филиалҳо, кормандон, қарзҳо, анбор ва касса бо асбобҳо ҷавоб деҳ.
- Бо ҳамон забоне ҷавоб деҳ, ки корбар навишт (тоҷикӣ ё русӣ). Кӯтоҳ ва аниқ: 1–6 сатр.
- Рақамҳоро танҳо аз асбобҳо гир, чизе наофар. Агар асбоби мувофиқ набошад, рост бигӯ, ки ин маълумотро надорӣ.
- Пул бо «сомонӣ». Матни оддӣ ё рӯйхат бо «• », бе ҷадвал ва сарлавҳа.
Имрӯз: ${localDay()} (вақти Душанбе).
Филиалҳо: ${branches.map((b) => `${b.id} — ${b.name}`).join('; ') || 'нест'}.`;

    const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await this.client!.beta.messages.create({
        model: this.model,
        max_tokens: 8000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system,
        tools: TOOLS,
        messages,
      });
      if (response.stop_reason === 'refusal') return 'Бубахшед, ба ин савол ҷавоб дода наметавонам.';
      if (response.stop_reason !== 'tool_use') {
        const reply = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim();
        return reply || 'Ҷавоб холӣ омад — саволро дигар хел нависед.';
      }
      // Ҳамаи блокҳо (thinking ҳам) бетағйир бармегарданд — талаби API барои давом
      messages.push({ role: 'assistant', content: response.content });
      const calls = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      const results = await Promise.all(
        calls.map(async (c): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
          try {
            const data = await this.run(user, c.name, c.input as Record<string, unknown>);
            return { type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(data) };
          } catch (e) {
            return { type: 'tool_result', tool_use_id: c.id, content: e instanceof Error ? e.message : 'Хато', is_error: true };
          }
        }),
      );
      messages.push({ role: 'user', content: results });
    }
    this.logger.warn(`Ҳадди ${MAX_STEPS} қадам барои корбари ${user.id}`);
    return 'Савол хеле мураккаб шуд — лутфан онро соддатар ё қисм-қисм пурсед.';
  }

  /** Иҷрои як асбоб — ҳама бо ҳуқуқҳои корбар (branchIdList ҳангоми филиали бегона хато медиҳад) */
  private async run(user: AuthUser, name: string, input: Record<string, unknown>) {
    const period = (['day', 'week', 'month'].includes(input.period as string) ? input.period : 'day') as Period;
    const branchIds = branchIdList(user, typeof input.branch_id === 'number' ? input.branch_id : undefined);
    const scope = { organizationId: user.organizationId, branchIds };
    const day = () => {
      if (typeof input.date !== 'string') return startOfLocalDay();
      const d = new Date(`${input.date}T00:00:00+05:00`);
      if (Number.isNaN(d.getTime())) throw new Error('Санаи нодуруст');
      return d;
    };
    switch (name) {
      case 'sales_stats':
        return this.stats.periodStats({ in: branchIds }, periodStart(period));
      case 'branch_ranking':
        return this.stats.branchRanking(branchIds, period);
      case 'top_products':
        return this.stats.topProducts({ in: branchIds }, period, 10);
      case 'late_staff':
        return this.insights.lateStaff(scope, day());
      case 'debtors':
        return this.insights.debtors(scope, input.overdue_only === true);
      case 'stock_forecast':
        return (await this.insights.stockForecast(scope)).slice(0, 30);
      case 'cash_closings':
        return this.insights.cashClosings(scope, day());
      default:
        throw new Error(`Асбоби номаълум: ${name}`);
    }
  }
}

@Controller('ai')
@Feature('assistant')
@Roles('CHEF', 'MANAGER')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('assistant')
  // Ҳар савол ба Claude пул дорад — 20 савол дар як дақиқа кифоя
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  chat(@CurrentUser() user: AuthUser, @Body() dto: AssistantDto) {
    return this.assistant.chat(user, dto.messages);
  }
}

@Module({
  imports: [StatsModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
