import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { pool } from './db';
import { HttpError } from './auth';
import type { MediaFile } from './types';

// Uploads are runtime data and must not be bundled into the server build.
export const uploadRoot = () => process.env.UPLOAD_DIR ? path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR) : path.join(process.cwd(), 'uploads');
export const uploadPath = (name: string) => path.join(/* turbopackIgnore: true */ uploadRoot(), name);
export function mediaRecord(row: Record<string, unknown>): MediaFile {
  return { ...row, size: Number(row.size), url: `/media/${row.storage_name}`, thumbnailUrl: row.thumbnail ? `/media/${row.thumbnail}` : null } as MediaFile;
}
export async function referencesFor(storageName: string) {
  const url = `/media/${storageName}`;
  const { rows } = await pool.query(`SELECT '网站草稿' AS name FROM site WHERE strpos(draft::text,$1)>0 UNION ALL SELECT '已发布网站' FROM site WHERE strpos(published::text,$1)>0 UNION ALL SELECT kind||'：'||slug||'（草稿）' FROM entries WHERE strpos(data::text,$1)>0 UNION ALL SELECT kind||'：'||slug||'（已发布）' FROM entries WHERE strpos(published_data::text,$1)>0`, [url]);
  return rows.map(r => r.name as string);
}
export async function uploadFile(file: File, folderId: string | null) {
  if (file.size > 50 * 1024 * 1024) throw new HttpError(400, `${file.name} 超过单文件 50 MB。`);
  const id = randomUUID(); const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 12);
  const storageName = `${id}${ext}`; const bytes = Buffer.from(await file.arrayBuffer());
  await mkdir(uploadRoot(), { recursive: true });
  let thumbnail: string | null = null;
  await writeFile(uploadPath(storageName), bytes);
  try {
    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      thumbnail = `${id}.thumb.webp`;
      try { await sharp(bytes, { animated: false }).rotate().resize(640, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(uploadPath(thumbnail)); }
      catch { thumbnail = null; }
    }
    const { rows } = await pool.query('INSERT INTO files(id,name,storage_name,mime,size,folder_id,thumbnail) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [id, file.name, storageName, file.type || 'application/octet-stream', file.size, folderId, thumbnail]);
    return mediaRecord(rows[0]);
  } catch (e) {
    await unlink(uploadPath(storageName)).catch(() => {});
    if (thumbnail) await unlink(uploadPath(thumbnail)).catch(() => {});
    throw e;
  }
}
export async function deleteFile(id: string) {
  const { rows } = await pool.query('SELECT * FROM files WHERE id=$1', [id]);
  if (!rows[0]) throw new HttpError(404, '文件不存在。');
  const refs = await referencesFor(rows[0].storage_name);
  if (refs.length) throw new HttpError(409, `文件正在使用：${refs.join('、')}。请先移除对应引用。`);
  // Metadata is removed only after disk deletion succeeds; a missing disk file is recoverable.
  await unlink(uploadPath(rows[0].storage_name)).catch(e => { if (e.code !== 'ENOENT') throw e; });
  if (rows[0].thumbnail) await unlink(uploadPath(rows[0].thumbnail)).catch(e => { if (e.code !== 'ENOENT') throw e; });
  await pool.query('DELETE FROM files WHERE id=$1', [id]);
}
