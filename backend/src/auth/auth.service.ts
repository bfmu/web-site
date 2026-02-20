import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    const { email, password, name, avatar } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('El usuario ya existe');
    }

    // Verificar si es el primer usuario (será admin automáticamente)
    const userCount = await this.userModel.countDocuments();
    const isFirstUser = userCount === 0;

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario
    const user = await this.userModel.create({
      email,
      password: hashedPassword,
      name,
      avatar,
      provider: 'local',
      role: isFirstUser ? 'admin' : 'user', // Primer usuario es admin
    });

    // Generar tokens
    const tokens = await this.generateTokens(user);

    // Guardar refresh token
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    // Log para indicar si se creó un admin
    if (isFirstUser) {
      console.log(`🎉 Primer admin creado: ${email}`);
    }

    return { user: this.sanitizeUser(user), tokens };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    const { email, password } = loginDto;

    // Buscar usuario por email (sin importar provider)
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar que el usuario tenga contraseña (no solo OAuth)
    if (!user.password) {
      throw new UnauthorizedException('Esta cuenta solo puede usar autenticación OAuth (Google/GitHub)');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario desactivado. Contacta al administrador.');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar tokens
    const tokens = await this.generateTokens(user);

    // Guardar refresh token
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  async googleLogin(
    profile: any,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    const { id, emails, displayName, photos } = profile;
    const email = emails[0].value;

    // Buscar usuario por email (sin importar el provider)
    let user = await this.userModel.findOne({ email });

    if (user) {
      // Usuario existe, actualizar datos de OAuth sin eliminar password
      console.log(`🔗 Vinculando cuenta Google a usuario existente: ${email} (provider: ${user.provider})`);
      
      // Actualizar información solo si no tiene providerId de Google
      if (user.providerId !== id || user.provider !== 'google') {
        const avatarUrl = photos?.[0]?.value;
        
        // Solo actualizar avatar si OAuth trae uno Y el usuario no tiene uno
        if (avatarUrl && (!user.avatar || user.avatar === '/default-avatar.svg')) {
          user.avatar = avatarUrl;
        }
        
        // Actualizar nombre solo si OAuth trae uno mejor
        if (displayName && displayName.trim()) {
          user.name = displayName;
        }
        
        // Guardar providerId pero MANTENER provider original y password
        // Esto permite login con ambos métodos
        if (!user.providerId) {
          user.providerId = id;
          console.log(`✅ OAuth vinculado. Usuario puede usar email/password O Google`);
        }
        
        await user.save();
      }
    } else {
      // Usuario no existe, crear nuevo con OAuth
      const userCount = await this.userModel.countDocuments();
      const isFirstUser = userCount === 0;
      const avatarUrl = photos?.[0]?.value || null;

      user = await this.userModel.create({
        email,
        name: displayName,
        avatar: avatarUrl,
        provider: 'google',
        providerId: id,
        role: isFirstUser ? 'admin' : 'user',
        isActive: true,
      });

      if (isFirstUser) {
        console.log(`🎉 Primer admin creado via Google OAuth: ${email}`);
      }

      console.log(`📸 Google user created with avatar: ${avatarUrl || 'none'}`);
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario desactivado. Contacta al administrador.');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  async githubLogin(
    profile: any,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    const { id, emails, displayName, photos, _json } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException('Email no disponible desde GitHub');
    }

    // Buscar usuario por email (sin importar el provider)
    let user = await this.userModel.findOne({ email });

    if (user) {
      // Usuario existe, actualizar datos de OAuth sin eliminar password
      console.log(`🔗 Vinculando cuenta GitHub a usuario existente: ${email} (provider: ${user.provider})`);
      
      // Actualizar información solo si no tiene providerId de GitHub
      if (user.providerId !== id.toString() || user.provider !== 'github') {
        const avatarUrl = photos?.[0]?.value || _json?.avatar_url;
        
        // Solo actualizar avatar si OAuth trae uno Y el usuario no tiene uno
        if (avatarUrl && (!user.avatar || user.avatar === '/default-avatar.svg')) {
          user.avatar = avatarUrl;
        }
        
        // Actualizar nombre solo si OAuth trae uno mejor
        const newName = displayName || _json?.name;
        if (newName && newName.trim()) {
          user.name = newName;
        }
        
        // Guardar providerId pero MANTENER provider original y password
        // Esto permite login con ambos métodos
        if (!user.providerId) {
          user.providerId = id.toString();
          console.log(`✅ OAuth vinculado. Usuario puede usar email/password O GitHub`);
        }
        
        await user.save();
      }
    } else {
      // Usuario no existe, crear nuevo con OAuth
      const userCount = await this.userModel.countDocuments();
      const isFirstUser = userCount === 0;
      const avatarUrl = photos?.[0]?.value || _json?.avatar_url || null;

      user = await this.userModel.create({
        email,
        name: displayName || _json?.name || `GitHub User ${id}`,
        avatar: avatarUrl,
        provider: 'github',
        providerId: id.toString(),
        role: isFirstUser ? 'admin' : 'user',
        isActive: true,
      });

      if (isFirstUser) {
        console.log(`🎉 Primer admin creado via GitHub OAuth: ${email}`);
      }

      console.log(`📸 GitHub user created with avatar: ${avatarUrl || 'none'}`);
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario desactivado. Contacta al administrador.');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Token de acceso denegado');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Token de acceso denegado');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: null });
  }

  // Método especial para crear admins desde CLI
  async createAdmin(
    adminData: { name: string; email: string; password: string },
  ): Promise<{ user: Partial<User>; tokens: any }> {
    const { email, password, name } = adminData;

    // Verificar si el usuario ya existe
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Un usuario con este email ya existe');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear admin
    const user = await this.userModel.create({
      email,
      password: hashedPassword,
      name,
      provider: 'local',
      role: 'admin', // Siempre es admin
    });

    // Generar tokens
    const tokens = await this.generateTokens(user);

    // Guardar refresh token
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  // Método para promover usuario a admin (solo para admins existentes)
  async promoteToAdmin(
    targetEmail: string,
    adminEmail: string,
  ): Promise<{ user: Partial<User>; message: string }> {
    // Buscar al usuario objetivo
    const targetUser = await this.userModel.findOne({ email: targetEmail });
    if (!targetUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (targetUser.role === 'admin') {
      throw new ConflictException('El usuario ya es administrador');
    }

    // Actualizar rol
    targetUser.role = 'admin';
    await targetUser.save();

    console.log(`👑 ${adminEmail} promovió a ${targetEmail} como admin`);

    return {
      user: this.sanitizeUser(targetUser),
      message: `Usuario ${targetEmail} promovido a administrador exitosamente`,
    };
  }

  // Crear usuario desde el panel admin (solo admins)
  async createUser(
    createUserDto: { email: string; password: string; name: string; role: 'admin' | 'editor' | 'user' },
    adminEmail: string,
  ): Promise<{ user: Partial<User>; message: string }> {
    const { email, password, name, role } = createUserDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Un usuario con este email ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.userModel.create({
      email,
      password: hashedPassword,
      name,
      provider: 'local',
      role,
      isActive: true,
    });

    console.log(`👤 ${adminEmail} creó usuario: ${email} (rol: ${role})`);

    return {
      user: this.sanitizeUser(user),
      message: `Usuario ${email} creado exitosamente`,
    };
  }

  // Listar todos los usuarios (solo para admins)
  async getAllUsers(): Promise<Partial<User>[]> {
    const users = await this.userModel
      .find({})
      .select('-password -refreshToken')
      .sort({ createdAt: -1 });

    return users.map(user => this.sanitizeUser(user));
  }

  // Cambiar rol de usuario
  async changeUserRole(
    userId: string,
    newRole: 'user' | 'admin' | 'editor',
    adminEmail: string,
  ): Promise<{ user: Partial<User>; message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    console.log(`🔄 ${adminEmail} cambió el rol de ${user.email}: ${oldRole} → ${newRole}`);

    return {
      user: this.sanitizeUser(user),
      message: `Rol de ${user.email} cambiado de ${oldRole} a ${newRole}`,
    };
  }

  // Activar/desactivar usuario
  async toggleUserStatus(
    userId: string,
    adminEmail: string,
  ): Promise<{ user: Partial<User>; message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const newStatus = !user.isActive;
    user.isActive = newStatus;
    await user.save();

    const action = newStatus ? 'activó' : 'desactivó';
    console.log(`⚡ ${adminEmail} ${action} al usuario ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      message: `Usuario ${user.email} ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
    };
  }

  // Buscar usuario por email (para CLI)
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  private sanitizeUser(user: UserDocument): Partial<User> {
    const { password, refreshToken, ...sanitizedUser } = user.toObject();
    // Asegurar que siempre haya un avatar por defecto
    if (!sanitizedUser.avatar) {
      sanitizedUser.avatar = '/default-avatar.svg';
    }
    return sanitizedUser;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email });
    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async findById(id: string): Promise<User> {
    return this.userModel.findById(id);
  }

  // Actualizar perfil del usuario
  async updateProfile(
    userId: string,
    updateData: { name?: string; avatar?: string },
  ): Promise<Partial<User>> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (updateData.name) {
      user.name = updateData.name;
    }
    if (updateData.avatar) {
      user.avatar = updateData.avatar;
    }

    await user.save();
    return this.sanitizeUser(user);
  }

  // Cambiar/establecer contraseña
  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Si el usuario ya tiene contraseña, verificar la actual
    if (user.password) {
      if (!currentPassword) {
        throw new UnauthorizedException('Debes proporcionar tu contraseña actual');
      }
      
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Contraseña actual incorrecta');
      }
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;

    // Si el provider era solo OAuth, actualizarlo a 'local' para permitir login con password
    if (user.provider === 'google' || user.provider === 'github') {
      user.provider = 'local';
      console.log(`🔑 Usuario ${user.email} estableció contraseña. Ahora puede usar email/password además de OAuth`);
    }

    await user.save();

    return { message: 'Contraseña actualizada exitosamente' };
  }
}
