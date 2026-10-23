import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { toUser } from '../common/serializers';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, UpdateMeDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { branch: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Почта ё парол нодуруст аст');
    }
    if (!user.isActive) throw new UnauthorizedException('Ҳисоби шумо ғайрифаъол аст');
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: toUser(user) };
  }

  async me(id: number) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id }, include: { branch: true } });
    return toUser(user);
  }

  async updateMe(id: number, dto: UpdateMeDto) {
    const data: { fullName?: string; phone?: string; passwordHash?: string } = {};
    if (dto.fullName) data.fullName = dto.fullName.trim();
    if (dto.phone) data.phone = dto.phone.trim();
    if (dto.newPassword) {
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
      if (!dto.currentPassword || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
        throw new BadRequestException('Пароли ҳозира нодуруст аст');
      }
      data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }
    const user = await this.prisma.user.update({ where: { id }, data, include: { branch: true } });
    return toUser(user);
  }
}
