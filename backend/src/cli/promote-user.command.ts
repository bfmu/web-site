#!/usr/bin/env ts-node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { Command } from 'commander';

const program = new Command();

program
  .name('promote-user')
  .description('Promover un usuario existente a administrador')
  .requiredOption('-e, --email <email>', 'Email del usuario a promover')
  .action(async (options) => {
    console.log('🚀 Iniciando promoción de usuario...\n');

    try {
      const app = await NestFactory.createApplicationContext(AppModule);
      const authService = app.get(AuthService);

      // Buscar el usuario por email
      const user = await authService.findByEmail(options.email);
      if (!user) {
        console.error(`❌ Usuario con email ${options.email} no encontrado`);
        process.exit(1);
      }

      // Verificar si ya es admin
      if (user.role === 'admin') {
        console.log(`ℹ️ El usuario ${options.email} ya es administrador`);
        await app.close();
        return;
      }

      // Promover a admin
      user.role = 'admin';
      await user.save();

      console.log(`✅ ¡Usuario promovido exitosamente!`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Nombre: ${user.name}`);
      console.log(`🔑 Rol anterior: user → Nuevo rol: admin`);
      console.log(`🆔 ID: ${user._id}\n`);

      await app.close();
    } catch (error) {
      console.error('❌ Error promoviendo usuario:', error.message);
      process.exit(1);
    }
  });

// Ejecutar el comando si este archivo es ejecutado directamente
if (require.main === module) {
  program.parse(process.argv);
}

export { program };
