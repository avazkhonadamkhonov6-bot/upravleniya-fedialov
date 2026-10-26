import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthUser, CurrentUser, Feature, Public, Roles } from './decorators';
import { CreateBusinessDto, LoginDto, RegisterClientDto, RegisterDto, UpdateMeDto, UpdateOrganizationDto } from './dto';

@Controller('auth')
@Feature('profile')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('register-client')
  registerClient(@Body() dto: RegisterClientDto) {
    return this.auth.registerClient(dto);
  }

  /** Бизнесҳои шеф ва гузариш байни онҳо */
  @Get('businesses')
  @Roles('CHEF')
  businesses(@CurrentUser() user: AuthUser) {
    return this.auth.businesses(user);
  }

  @Post('businesses')
  @Roles('CHEF')
  createBusiness(@CurrentUser() user: AuthUser, @Body() dto: CreateBusinessDto) {
    return this.auth.createBusiness(user, dto);
  }

  @Post('businesses/:id/switch')
  @HttpCode(200)
  @Roles('CHEF')
  switchBusiness(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.auth.switchBusiness(user, id);
  }

  @Get('organization')
  organization(@CurrentUser() user: AuthUser) {
    return this.auth.organization(user.organizationId);
  }

  /** Номи ширкат ва навъи кор — танҳо соҳиб (шеф) */
  @Patch('organization')
  @Roles('CHEF')
  updateOrganization(@CurrentUser() user: AuthUser, @Body() dto: UpdateOrganizationDto) {
    return this.auth.updateOrganization(user.organizationId, dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user.id, dto);
  }
}
