import { Controller, Get, Query } from '@nestjs/common';
import type { Period } from '@filialhub/shared';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { scopeBranch } from '../common/access';
import { Granularity, StatsService } from './stats.service';

const PERIODS: Period[] = ['day', 'week', 'month'];

function parsePeriod(v?: string): Period {
  return PERIODS.includes(v as Period) ? (v as Period) : 'day';
}

@Controller('stats')
@Roles('CHEF', 'MANAGER')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.stats.overview(scopeBranch(user, Number(branchId) || undefined));
  }

  @Get('timeseries')
  timeseries(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('granularity') granularity?: string,
    @Query('points') points?: string,
  ) {
    const g = (PERIODS.includes(granularity as Period) ? granularity : 'day') as Granularity;
    const defaults = { day: 30, week: 12, month: 12 };
    const n = Math.min(Math.max(Number(points) || defaults[g], 1), 366);
    return this.stats.timeseries(scopeBranch(user, Number(branchId) || undefined), g, n);
  }

  @Get('branches')
  @Roles('CHEF')
  branches(@Query('period') period?: string) {
    return this.stats.branchRanking(parsePeriod(period));
  }

  @Get('products')
  products(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string, @Query('period') period?: string) {
    return this.stats.topProducts(scopeBranch(user, Number(branchId) || undefined), parsePeriod(period));
  }
}
