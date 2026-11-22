import { pool } from './db';
import type { SiteConfig, Entry, EntryKind } from './types';
import { HttpError } from './auth';
import { withSiteDefaults } from './site-config';
import { plain, safeHref } from './rich';

export async function getSite(preview = false): Promise<SiteConfig> {
  const { rows } = await pool.query('SELECT draft,published FROM site WHERE id=1');
  if (!rows[0]) throw new Error('数据库尚未初始化，请运行 npm run db:migrate 和 npm run db:seed。');
  return withSiteDefaults(preview ? rows[0].draft : rows[0].published);
}
export async function getEntries(kind?: EntryKind, preview = false): Promise<Entry[]> {
  const key = preview ? 'data' : 'published_data';
  const { rows } = await pool.query(`SELECT * FROM entries WHERE ($1::text IS NULL OR kind=$1) ${preview ? '' : 'AND published_data IS NOT NULL'} ORDER BY COALESCE((${key}->>'featured')::boolean,false) DESC,COALESCE((${key}->>'order')::numeric,0), ${key}->>'date' DESC, published_at DESC NULLS LAST, created_at DESC`, [kind ?? null]);
  return rows.map(row => ({ ...row, slug: preview ? row.slug : row.published_slug || row.slug, data: preview ? row.data : row.published_data }));
}
export function validateSite(input: unknown): asserts input is SiteConfig {
  const value = input as SiteConfig;
  if (!value || typeof value.name !== 'string' || !value.name.trim() || typeof value.title !== 'string' || !Array.isArray(value.sections) || !Array.isArray(value.navigation) || !value.footer || !value.contact || !value.notFound) throw new HttpError(400, '网站配置不完整。');
  const ids = value.sections.map(s => s.id);
  if (new Set(ids).size !== ids.length || ids.some(id => !/^[a-zA-Z][\w-]*$/.test(id))) throw new HttpError(400, '区域锚点必须以英文字母开头，且不能重复。');
  if (value.sections.filter(s => s.kind === 'hero').length !== 1) throw new HttpError(400, '首页需要保留一个首屏区域。');
  for (const s of value.sections) {
    if (!['hero','services','cases','about','news','contact','text'].includes(s.kind) || !Array.isArray(s.items) || typeof s.title !== 'string' || typeof s.body !== 'string') throw new HttpError(400, '区域内容格式不正确。');
  }
  if (value.footer.filingEnabled && (!value.footer.filingText.trim() || !value.footer.filingHref.trim())) throw new HttpError(400, '开启备案显示时，请同时填写备案号和跳转链接。');
  if (value.footer.policeFilingEnabled && (
    typeof value.footer.policeFilingText !== 'string' || !plain(value.footer.policeFilingText) ||
    typeof value.footer.policeFilingHref !== 'string' || !safeHref(value.footer.policeFilingHref)
  )) throw new HttpError(400, '开启公安备案显示时，请同时填写公安备案号和有效的跳转链接。');
}
