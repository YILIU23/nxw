import 'dotenv/config';
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('请先配置 .env 中的 DATABASE_URL。');
const url = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('本机数据库工具只用于 localhost；远程数据库请直接连接。');
const databaseDir = path.resolve('.data/postgres');
mkdirSync('.data',{recursive:true});
const database = new EmbeddedPostgres({ databaseDir, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), port: Number(url.port || 5432), persistent: true, authMethod: 'scram-sha-256', initdbFlags: ['--encoding=UTF8','--locale=C'], postgresFlags: ['-h','127.0.0.1'], onLog:message=>appendFileSync('.data/postgres.log',String(message)), onError:message=>console.error(message) });
const require=createRequire(import.meta.url);
const nativePlatform=process.platform==='win32'?'windows':process.platform;
const nativeRoot=path.resolve(path.dirname(require.resolve(`@embedded-postgres/${nativePlatform}-${process.arch}`)),'../native/bin');
const control=path.join(nativeRoot,process.platform==='win32'?'pg_ctl.exe':'pg_ctl');
const runControl=(args:string[])=>new Promise<void>((resolve,reject)=>{const child=spawn(control,args,{windowsHide:true,stdio:'ignore'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`PostgreSQL 控制命令退出码 ${code}；请查看 .data/postgres.log。`)));});
if(process.argv[2]==='stop'){
  await runControl(['-D',databaseDir,'-m','fast','-w','stop']);
  console.log('本项目 PostgreSQL 已停止，数据保留。');
  process.exit(0);
}
if (!existsSync(path.join(databaseDir,'PG_VERSION'))) await database.initialise();
const running=await runControl(['-D',databaseDir,'status']).then(()=>true,()=>false);
// pg_ctl correctly creates a restricted token on Windows when launched by an administrator.
if(!running)await runControl(['-D',databaseDir,'-l',path.resolve('.data/postgres.log'),'-o',`-p ${url.port || 5432} -h 127.0.0.1`,'-w','start']);
const connection=new URL(url);connection.pathname='/postgres';
const client=new pg.Client({connectionString:connection.href});await client.connect();
const name=decodeURIComponent(url.pathname.slice(1));
const existing=await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[name]);
if(!existing.rowCount)await client.query(`CREATE DATABASE "${name.replaceAll('"','""')}"`);
await client.end();
console.log(`本机 PostgreSQL 已启动：127.0.0.1:${url.port || 5432}；数据目录 .data/postgres。停止命令：npm run db:stop。`);
