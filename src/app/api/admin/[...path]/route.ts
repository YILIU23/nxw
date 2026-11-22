import { randomUUID } from 'node:crypto';
import { requireAdmin, HttpError } from '@/lib/auth';
import { pool } from '@/lib/db';
import { validateSite } from '@/lib/content';
import { plain } from '@/lib/rich';
import { uploadFile, mediaRecord, referencesFor, deleteFile } from '@/lib/media';
import type { EntryContent } from '@/lib/types';
import { cleanContent } from '@/lib/markup';
import { withSiteDefaults } from '@/lib/site-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function validEntry(data: EntryContent) {
  if (!data || !plain(data.title) || typeof data.body !== 'string' || !Number.isFinite(Number(data.order)) || !data.date || Number.isNaN(Date.parse(data.date))) throw new HttpError(400, '请填写标题、有效日期和排序。');
}
async function handle(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const admin = await requireAdmin(); const { path } = await ctx.params; const [resource, id] = path;
    const method = request.method;
    if (resource === 'site' && method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM site WHERE id=1');
      const entries = await pool.query('SELECT * FROM entries ORDER BY updated_at DESC');
      return Response.json({ ...rows[0], draft: withSiteDefaults(rows[0].draft), published: withSiteDefaults(rows[0].published), entries: entries.rows, username: admin.username });
    }
    if (resource === 'site' && method === 'PUT') {
      const body = cleanContent(await request.json()); validateSite(body.data);
      body.data = withSiteDefaults(body.data);
      const publish = body.publish === true;
      const { rows } = await pool.query(`UPDATE site SET draft=$1, published=CASE WHEN $3 THEN $1::jsonb ELSE published END, published_at=CASE WHEN $3 THEN now() ELSE published_at END, revision=revision+1,updated_at=now() WHERE id=1 AND revision=$2 RETURNING *`, [JSON.stringify(body.data), body.revision, publish]);
      if (!rows[0]) throw new HttpError(409, '内容已在其他窗口更新，请重新载入后编辑。');
      return Response.json(rows[0]);
    }
    if (resource === 'entries' && method === 'POST') {
      const body = cleanContent(await request.json()); validEntry(body.data);
      if (!['service', 'case', 'news'].includes(body.kind)) throw new HttpError(400, '内容类型不正确。');
      const slug = String(body.slug || '').trim(); if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) throw new HttpError(400, '页面路径请使用小写英文、数字和短横线。');
      const { rows } = await pool.query('INSERT INTO entries(id,kind,slug,data,published_data,published_at,published_slug) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [randomUUID(), body.kind, slug, JSON.stringify(body.data), body.publish ? JSON.stringify(body.data) : null, body.publish ? new Date() : null, body.publish ? slug : null]);
      return Response.json(rows[0], { status: 201 });
    }
    if (resource === 'entries' && id && method === 'PUT') {
      const body = cleanContent(await request.json()); validEntry(body.data);
      if (!/^[a-z0-9][a-z0-9_-]*$/.test(body.slug)) throw new HttpError(400, '页面路径请使用小写英文、数字和短横线。');
      const { rows } = await pool.query(`UPDATE entries SET slug=$2,data=$3,published_data=CASE WHEN $5 THEN $3::jsonb WHEN $6 THEN NULL ELSE published_data END,published_slug=CASE WHEN $5 THEN $2 WHEN $6 THEN NULL ELSE published_slug END,published_at=CASE WHEN $5 THEN now() WHEN $6 THEN NULL ELSE published_at END,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$4 RETURNING *`, [id, body.slug, JSON.stringify(body.data), body.revision, body.publish === true, body.unpublish === true]);
      if (!rows[0]) throw new HttpError(409, '内容已更新或被删除，请重新载入。');
      return Response.json(rows[0]);
    }
    if (resource === 'entries' && id && method === 'DELETE') { await pool.query('DELETE FROM entries WHERE id=$1', [id]); return Response.json({ ok: true }); }
    if (resource === 'files' && method === 'GET') {
      const url = new URL(request.url); const folder = url.searchParams.get('folder'); const search = url.searchParams.get('q') || ''; const type = url.searchParams.get('type') || '';
      const { rows } = await pool.query(`SELECT * FROM files WHERE ($1::uuid IS NULL AND folder_id IS NULL OR folder_id=$1) AND (name ILIKE $2 OR alt ILIKE $2) AND mime LIKE $3 ORDER BY created_at DESC`, [folder || null, `%${search}%`, `${type}%`]);
      const folders = await pool.query('SELECT * FROM folders ORDER BY name');
      const files = await Promise.all(rows.map(async row => ({ ...mediaRecord(row), references: await referencesFor(row.storage_name) })));
      const stats = await pool.query('SELECT count(*)::int AS count,COALESCE(sum(size),0)::text AS size FROM files');
      return Response.json({ files, folders: folders.rows, stats: stats.rows[0] });
    }
    if (resource === 'files' && method === 'POST') {
      const form = await request.formData(); const folder = form.get('folder')?.toString() || null;
      const uploads = form.getAll('files').filter((f): f is File => f instanceof File);
      if (!uploads.length) throw new HttpError(400, '请选择上传文件。');
      // Report individual failures so successfully uploaded files are never silently lost.
      const files = []; const errors = [];
      for (const file of uploads) { try { files.push(await uploadFile(file, folder)); } catch (e) { errors.push(`${file.name}：${e instanceof Error ? e.message : '上传失败'}`); } }
      return Response.json({ files, errors }, { status: files.length ? 201 : 400 });
    }
    if (resource === 'files' && id && method === 'PUT') {
      const body = await request.json(); if (!String(body.name || '').trim()) throw new HttpError(400, '请填写文件名称。');
      const { rows } = await pool.query('UPDATE files SET name=$2,alt=$3,folder_id=$4 WHERE id=$1 RETURNING *', [id, body.name.trim(), String(body.alt || ''), body.folder_id || null]);
      if (!rows[0]) throw new HttpError(404, '文件不存在。'); return Response.json(mediaRecord(rows[0]));
    }
    if (resource === 'files' && id && method === 'DELETE') { await deleteFile(id); return Response.json({ ok: true }); }
    if (resource === 'folders' && method === 'POST') {
      const body = await request.json(); if (!String(body.name || '').trim()) throw new HttpError(400, '请填写文件夹名称。');
      const { rows } = await pool.query('INSERT INTO folders(id,name,parent_id) VALUES($1,$2,$3) RETURNING *', [randomUUID(), body.name.trim(), body.parent_id || null]); return Response.json(rows[0], { status: 201 });
    }
    if (resource === 'folders' && id && method === 'PUT') {
      const body = await request.json(); if (!String(body.name || '').trim()) throw new HttpError(400, '请填写文件夹名称。');
      await pool.query('UPDATE folders SET name=$2 WHERE id=$1', [id, body.name.trim()]); return Response.json({ ok: true });
    }
    if (resource === 'folders' && id && method === 'DELETE') { await pool.query('DELETE FROM folders WHERE id=$1', [id]); return Response.json({ ok: true }); }
    throw new HttpError(404, '接口不存在。');
  } catch (error) {
    const code = (error as { code?: string }).code;
    const message = error instanceof HttpError ? error.message : code === '23505' ? '页面路径已被使用，请换一个路径。' : code === '23503' ? '文件夹仍有文件或子文件夹，请先移出后再删除。' : error instanceof SyntaxError ? '请求内容格式不正确。' : '操作失败，请稍后重试。';
    if (!(error instanceof HttpError)) console.error('Admin API:', error);
    return Response.json({ error: message }, { status: error instanceof HttpError ? error.status : code === '23505' || code === '23503' ? 409 : 500 });
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
