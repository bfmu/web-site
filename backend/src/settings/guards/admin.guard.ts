import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      console.error('❌ AdminGuard: No user found in request');
      throw new UnauthorizedException('No user found in request');
    }

    // Log para depuración
    console.log(`🔐 AdminGuard: Checking access for user ${user.email || user._id}, role: ${user.role}`);

    if (user.role !== 'admin') {
      console.warn(`⚠️ AdminGuard: Access denied for user ${user.email || user._id}, role: ${user.role}`);
      throw new UnauthorizedException('Only administrators can access this resource');
    }

    console.log(`✅ AdminGuard: Access granted for admin ${user.email || user._id}`);
    return true;
  }
}
