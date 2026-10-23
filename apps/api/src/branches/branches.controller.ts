import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.branches.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.branches.get(user, id);
  }

  @Post()
  @Roles('CHEF')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBranchDto) {
    return this.branches.create(user, dto);
  }

  @Patch(':id')
  @Roles('CHEF')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBranchDto) {
    return this.branches.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('CHEF')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.branches.remove(user, id);
  }
}
