import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { pool, transaction } from '../src/lib/db';
import { hashPassword } from '../src/lib/password';
import { defaultSite } from '../src/lib/defaults';

if (!process.env.ADMIN_PASSWORD) throw new Error('请先在 .env 设置 ADMIN_PASSWORD。');
await transaction(async client => {
  await client.query('INSERT INTO admins(id,username,password_hash) VALUES($1,$2,$3) ON CONFLICT(username) DO NOTHING', [randomUUID(), process.env.ADMIN_USERNAME || 'admin', hashPassword(process.env.ADMIN_PASSWORD!)]);
  await client.query('INSERT INTO site(id,draft,published,published_at) VALUES(1,$1,$1,now()) ON CONFLICT(id) DO NOTHING', [JSON.stringify(defaultSite)]);
});
console.log('初始化完成；再次运行不会覆盖现有账号或内容。');
await pool.end();
