import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import * as readline from 'readline';

const program = new Command();

// Función para leer input del usuario
function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Función para leer password de forma oculta
function askPassword(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (password) => {
      rl.close();
      resolve(password);
    });
  });
}

program
  .name('create-admin')
  .description('Crear un usuario administrador')
  .action(async () => {
    try {
      console.log('🚀 Iniciando creación de administrador...\n');

      // Inicializar la aplicación NestJS
      const app = await NestFactory.createApplicationContext(AppModule);
      const authService = app.get(AuthService);

      // Recopilar información del admin
      const name = await askQuestion('Nombre completo del admin: ');
      const email = await askQuestion('Email del admin: ');
      const password = await askPassword('Contraseña (mínimo 6 caracteres): ');

      // Validaciones básicas
      if (!name || !email || !password) {
        console.error('❌ Todos los campos son requeridos');
        process.exit(1);
      }

      if (password.length < 6) {
        console.error('❌ La contraseña debe tener al menos 6 caracteres');
        process.exit(1);
      }

      if (!email.includes('@')) {
        console.error('❌ Email inválido');
        process.exit(1);
      }

      // Crear el admin
      console.log('\n⏳ Creando administrador...');

      const result = await authService.createAdmin({
        name,
        email,
        password,
      });

      console.log(`\n✅ ¡Administrador creado exitosamente!`);
      console.log(`📧 Email: ${result.user.email}`);
      console.log(`👤 Nombre: ${result.user.name}`);
      console.log(`🔑 Rol: ${result.user.role}`);
      console.log(`🆔 ID: ${(result.user as any)._id}\n`);

      await app.close();
    } catch (error) {
      console.error('❌ Error creando administrador:', error.message);
      process.exit(1);
    }
  });

// Ejecutar el comando si este archivo es ejecutado directamente
if (require.main === module) {
  program.parse(process.argv);
}

export { program };
