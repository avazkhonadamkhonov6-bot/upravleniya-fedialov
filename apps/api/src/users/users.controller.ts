import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { POSITIONS, ROLES, type Position, type Role } from '@filialhub/shared';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';

@Controller('users')
@Roles('CHEF', 'MANAGER')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('role') role?: string,
    @Query('position') position?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.users.list(user, {
      branchId: Number(branchId) || undefined,
      role: ROLES.includes(role as Role) ? (role as Role) : undefined,
      position: POSITIONS.includes(position as Position) ? (position as Position) : undefined,
      search,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.users.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.users.remove(user, id);
  }
}
