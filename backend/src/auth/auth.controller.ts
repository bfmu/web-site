import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
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
    // Verificar si es un test
    const isTest = req.query.test === 'true';
    
    if (isTest) {
      // En modo test, enviar mensaje al window.opener (popup)
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oauth-test-success',
                  provider: 'google',
                  message: 'Configuración de Google OAuth validada exitosamente'
                }, '*');
                window.close();
              } else {
                document.body.innerHTML = '<h2>✅ Test exitoso! Puedes cerrar esta ventana.</h2>';
              }
            </script>
          </body>
        </html>
      `);
    }
    
    // Flujo normal de login
    const result = await this.authService.googleLogin(req.user);

    // Redireccionar al frontend con tokens
    const redirectUrl = `${
      process.env.FRONTEND_ADMIN_URL || 'http://localhost:4321'
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
    // Verificar si es un test
    const isTest = req.query.test === 'true';
    
    if (isTest) {
      // En modo test, enviar mensaje al window.opener (popup)
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oauth-test-success',
                  provider: 'github',
                  message: 'Configuración de GitHub OAuth validada exitosamente'
                }, '*');
                window.close();
              } else {
                document.body.innerHTML = '<h2>✅ Test exitoso! Puedes cerrar esta ventana.</h2>';
              }
            </script>
          </body>
        </html>
      `);
    }
    
    // Flujo normal de login
    const result = await this.authService.githubLogin(req.user);

    // Redireccionar al frontend con tokens
    const redirectUrl = `${
      process.env.FRONTEND_ADMIN_URL || 'http://localhost:4321'
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

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear usuario (solo admins)' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.authService.createUser(createUserDto, currentUser.email);
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

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() body: { name?: string; avatar?: string },
  ) {
    return this.authService.updateProfile(user._id, body);
  }

  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir avatar del usuario (requiere autenticación)' })
  @ApiResponse({ status: 201, description: 'Avatar subido correctamente' })
  async uploadAvatar(@UploadedFile() file: any, @CurrentUser() user: any) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Validar tipo de archivo
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      throw new BadRequestException('Solo se permiten archivos de imagen (jpg, jpeg, png, gif, webp)');
    }

    // Validar tamaño (máximo 5MB para avatares)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('El avatar no puede ser mayor a 5MB');
    }

    // Crear directorio de avatares si no existe
    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${user._id}-${timestamp}-${originalName}`;
    const filePath = path.join(avatarsDir, fileName);

    // Guardar archivo
    fs.writeFileSync(filePath, file.buffer);

    // Retornar URL relativa
    const avatarUrl = `/uploads/avatars/${fileName}`;

    // Actualizar avatar del usuario
    await this.authService.updateProfile(user._id, { avatar: avatarUrl });

    return {
      url: avatarUrl,
      filename: fileName,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar/establecer contraseña del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada exitosamente' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user._id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }
}
