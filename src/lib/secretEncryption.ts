import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc:v1';

function getEncryptionKey(): Buffer {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;

  if (!secret || secret.length < 32) {
    throw new Error(
      'Falta INTEGRATIONS_ENCRYPTION_KEY. Configura un secreto de al menos 32 caracteres en Vercel y en .env.local.'
    );
  }

  return createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(value: string): string {
  if (!value.startsWith(`${PREFIX}:`)) {
    throw new Error('La credencial guardada usa un formato inseguro o antiguo. Captúrala nuevamente.');
  }

  const parts = value.split(':');
  if (parts.length !== 5) {
    throw new Error('La credencial cifrada no tiene un formato válido.');
  }

  const iv = Buffer.from(parts[2], 'base64');
  const tag = Buffer.from(parts[3], 'base64');
  const encrypted = Buffer.from(parts[4], 'base64');
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
