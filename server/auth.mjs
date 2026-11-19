import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return 'scrypt:' + salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
}
export async function verifyPassword(password, stored) {
  const [algorithm, salt, digest] = String(stored ?? '').split(':');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(digest ?? '')) return false;
  const expected = Buffer.from(digest, 'hex');
  return timingSafeEqual(await scrypt(password, salt, 64), expected);
}
export const hashToken = token => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export function publicPerson(person) {
  const { senha_hash, cpf, ...safe } = person;
  return safe;
}
export function readToken(req) {
  const raw = (req.headers.cookie ?? '').split(';').map(x => x.trim()).find(x => x.startsWith('fieldiq_session='));
  return raw?.slice('fieldiq_session='.length) ?? '';
}
