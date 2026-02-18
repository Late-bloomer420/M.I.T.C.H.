import crypto from 'node:crypto';

// In a real app, these should be environment variables
const ALGORITHM = 'aes-256-cbc';
const DEFAULT_SECRET_KEY_HEX = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
const SECRET_KEY = process.env.ENCRYPTION_KEY || DEFAULT_SECRET_KEY_HEX; // 32 bytes for AES-256
const IV_LENGTH = 16; // AES block size

const key = Buffer.from(SECRET_KEY, 'hex');

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

export function hash(text: string): string {
    return crypto.createHmac('sha256', key).update(text).digest('hex');
}
