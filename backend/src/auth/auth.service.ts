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

    // Buscar usuario
    const user = await this.userModel.findOne({ email, provider: 'local' });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
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

    let user = await this.userModel.findOne({
      $or: [
        { email, provider: 'google' },
        { providerId: id, provider: 'google' },
      ],
    });

    if (!user) {
      user = await this.userModel.create({
        email,
        name: displayName,
        avatar: photos[0]?.value,
        provider: 'google',
        providerId: id,
      });
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  async githubLogin(
    profile: any,
  ): Promise<{ user: Partial<User>; tokens: any }> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException('Email no disponible desde GitHub');
    }

    let user = await this.userModel.findOne({
      $or: [
        { email, provider: 'github' },
        { providerId: id.toString(), provider: 'github' },
      ],
    });

    if (!user) {
      user = await this.userModel.create({
        email,
        name: displayName || `GitHub User ${id}`,
        avatar: photos?.[0]?.value,
        provider: 'github',
        providerId: id.toString(),
      });
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
    return sanitizedUser;
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email, provider: 'local' });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async findById(id: string): Promise<User> {
    return this.userModel.findById(id);
  }
}
