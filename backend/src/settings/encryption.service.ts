import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    
    if (!key) {
      console.warn('⚠️ ENCRYPTION_KEY not set. Using default key (NOT SECURE FOR PRODUCTION)');
      this.encryptionKey = Buffer.alloc(this.keyLength);
    } else if (key.length < this.keyLength) {
      // Pad key si es muy corto
      this.encryptionKey = Buffer.alloc(this.keyLength);
      Buffer.from(key).copy(this.encryptionKey);
    } else {
      this.encryptionKey = Buffer.from(key.slice(0, this.keyLength));
    }
  }

  /**
   * Encripta un texto usando AES-256-GCM
   * @param text Texto a encriptar
   * @returns Texto encriptado en formato: iv:encrypted:tag (todo en hex)
   */
  encrypt(text: string): string {
    if (!text) return '';

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Formato: iv:encrypted:tag
      return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Desencripta un texto encriptado
   * @param encryptedData Datos encriptados en formato iv:encrypted:tag
   * @returns Texto desencriptado
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const tag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Verifica si el texto está encriptado (formato correcto)
   */
  isEncrypted(text: string): boolean {
    if (!text) return false;
    const parts = text.split(':');
    return parts.length === 3;
  }
}
