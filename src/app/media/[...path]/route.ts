import { readFile } from 'node:fs/promises';
import { pool } from '@/lib/db';
import { uploadPath } from '@/lib/media';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await context.params;
  if (parts.length !== 1) return new Response('文件不存在', { status: 404 });
  const { rows } = await pool.query('SELECT * FROM files WHERE storage_name=$1 OR thumbnail=$1', [parts[0]]);
  if (!rows[0]) return new Response('文件不存在', { status: 404 });
  const file = rows[0]; const thumbnail = parts[0] === file.thumbnail; const download = new URL(request.url).searchParams.has('download');
  try {
    const bytes = await readFile(uploadPath(parts[0]));
    const inline = !download && (file.mime.startsWith('image/') && file.mime !== 'image/svg+xml' || file.mime.startsWith('video/') || file.mime.startsWith('audio/') || file.mime === 'application/pdf' || thumbnail);
    return new Response(bytes, { headers: { 'Content-Type': thumbnail ? 'image/webp' : file.mime, 'Content-Length': String(bytes.length), 'Cache-Control': 'no-store', 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}` } });
  } catch { return new Response('文件不存在', { status: 404 }); }
}
