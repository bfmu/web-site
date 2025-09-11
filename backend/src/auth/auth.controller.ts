import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar sesión con Google' })
  async googleAuth() {
    // Redirige automáticamente a Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user);

    // Redireccionar al frontend con tokens
    const redirectUrl = `${
      process.env.FRONTEND_ADMIN_URL || 'http://localhost:4200'
    }/auth/callback?token=${result.tokens.accessToken}&refresh=${
      result.tokens.refreshToken
    }`;
    res.redirect(redirectUrl);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Iniciar sesión con GitHub' })
  async githubAuth() {
    // Redirige automáticamente a GitHub
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.githubLogin(req.user);

    // Redireccionar al frontend con tokens
    const redirectUrl = `${
      process.env.FRONTEND_ADMIN_URL || 'http://localhost:4200'
    }/auth/callback?token=${result.tokens.accessToken}&refresh=${
      result.tokens.refreshToken
    }`;
    res.redirect(redirectUrl);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar tokens' })
  async refresh(@Body() body: { refreshToken: string; userId: string }) {
    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  async logout(@CurrentUser() user: any) {
    await this.authService.logout(user._id);
    return { message: 'Logout exitoso' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Post('promote-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Promover usuario a administrador (solo admins)' })
  async promoteToAdmin(
    @Body() body: { email: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.authService.promoteToAdmin(body.email, currentUser.email);
  }

  @Post('create-super-admin')
  @ApiOperation({ summary: 'Crear super administrador con clave secreta' })
  async createSuperAdmin(
    @Body() body: { email: string; password: string; name: string; secretKey: string },
  ) {
    // Clave secreta para crear el primer admin (configurable via .env)
    const SUPER_ADMIN_SECRET = process.env.SUPER_ADMIN_SECRET || 'mi_clave_super_secreta_2024';
    
    if (body.secretKey !== SUPER_ADMIN_SECRET) {
      throw new UnauthorizedException('Clave secreta incorrecta');
    }

    return this.authService.createAdmin({
      email: body.email,
      password: body.password,
      name: body.name,
    });
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los usuarios (solo admins)' })
  async getAllUsers(@CurrentUser() currentUser: any) {
    return this.authService.getAllUsers();
  }

  @Post('change-role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar rol de usuario (solo admins)' })
  async changeUserRole(
    @Body() body: { userId: string; newRole: 'user' | 'admin' | 'editor' },
    @CurrentUser() currentUser: any,
  ) {
    return this.authService.changeUserRole(body.userId, body.newRole, currentUser.email);
  }

  @Post('toggle-user-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activar/desactivar usuario (solo admins)' })
  async toggleUserStatus(
    @Body() body: { userId: string },
    @CurrentUser() currentUser: any,
  ) {
    return this.authService.toggleUserStatus(body.userId, currentUser.email);
  }
}
