import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { pool, transaction } from './db';
import { hashPassword, verifyPassword, tokenHash } from './password';
import { failedAttempt, normalizeAttempt, rateOptions, type Attempt } from './rate';

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const cookieName = 'nxw_session';
export async function currentAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const { rows } = await pool.query('SELECT a.id, a.username, s.rate_ip FROM admin_sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now()', [tokenHash(token)]);
  return rows[0] as { id: string; username: string; rate_ip: string } | undefined ?? null;
}
export async function requireAdmin() { const admin = await currentAdmin(); if (!admin) throw new HttpError(401, '登录已失效，请重新登录。'); return admin; }
export function requestIp(request: Request) {
  // Forwarded addresses are only accepted behind a configured trusted reverse proxy.
  return process.env.TRUST_PROXY === 'true' ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'direct' : 'direct';
}
export async function login(username: string, password: string, ip: string) {
  const name = username.trim().toLowerCase();
  if (!name || !password) throw new HttpError(400, '请输入账号和密码。');
  const outcome = await transaction(async client => {
    await client.query('INSERT INTO login_attempts(username,ip) VALUES($1,$2) ON CONFLICT DO NOTHING', [name, ip]);
    const { rows: attempts } = await client.query('SELECT failures,window_started,blocked_until FROM login_attempts WHERE username=$1 AND ip=$2 FOR UPDATE', [name, ip]);
    const now = new Date(); const opts = rateOptions(); const attempt = normalizeAttempt(attempts[0] as Attempt, now, opts.window);
    if (attempt.blocked_until && attempt.blocked_until > now) return { error: '尝试次数较多，请稍后再试。', status: 429, retry: Math.ceil((attempt.blocked_until.getTime() - now.getTime()) / 1000) };
    const { rows } = await client.query('SELECT id,password_hash FROM admins WHERE lower(username)=$1', [name]);
    if (!rows[0] || !verifyPassword(password, rows[0].password_hash)) {
      const failed = failedAttempt(attempt, now, opts);
      await client.query('UPDATE login_attempts SET failures=$3,window_started=$4,blocked_until=$5 WHERE username=$1 AND ip=$2', [name, ip, failed.failures, failed.window_started, failed.blocked_until]);
      return { error: failed.blocked_until ? `尝试次数较多，请 ${Math.ceil(opts.cooldown / 60000)} 分钟后再试。` : '账号或密码不正确。', status: failed.blocked_until ? 429 : 401, retry: failed.blocked_until ? Math.ceil(opts.cooldown / 1000) : undefined };
    }
    await client.query('DELETE FROM login_attempts WHERE username=$1 AND ip=$2', [name, ip]);
    const token = randomBytes(32).toString('hex');
    await client.query("INSERT INTO admin_sessions(token_hash,admin_id,rate_ip,expires_at) VALUES($1,$2,$3,now()+interval '7 days')", [tokenHash(token), rows[0].id, ip]);
    await client.query('DELETE FROM admin_sessions WHERE expires_at<now()');
    return { token };
  });
  if ('error' in outcome) return outcome;
  (await cookies()).set(cookieName, outcome.token!, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: 7 * 86400 });
  return { ok: true };
}
export async function logout() {
  const admin = await currentAdmin(); const jar = await cookies(); const token = jar.get(cookieName)?.value;
  if (admin && token) await transaction(async client => {
    await client.query('DELETE FROM admin_sessions WHERE token_hash=$1', [tokenHash(token)]);
    await client.query('DELETE FROM login_attempts WHERE username=$1 AND ip=$2', [admin.username.toLowerCase(), admin.rate_ip]);
  });
  jar.delete(cookieName);
}
export async function changePassword(oldPassword: string, newPassword: string) {
  const admin = await requireAdmin();
  if (newPassword.length < 6) throw new HttpError(400, '新密码至少填写 6 个字符。');
  await transaction(async client => {
    const { rows } = await client.query('SELECT password_hash FROM admins WHERE id=$1 FOR UPDATE', [admin.id]);
    if (!verifyPassword(oldPassword, rows[0].password_hash)) throw new HttpError(400, '原密码不正确。');
    await client.query('UPDATE admins SET password_hash=$2 WHERE id=$1', [admin.id, hashPassword(newPassword)]);
    await client.query('DELETE FROM login_attempts WHERE username=$1', [admin.username.toLowerCase()]);
  });
}
