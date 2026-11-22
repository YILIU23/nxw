import { notFound } from 'next/navigation';
import { getSite, getEntries } from '@/lib/content';
import { Website } from '@/components/public/Website';
import { EntryDetail } from '@/components/public/EntryDetail';
import { plain } from '@/lib/rich';
import type { EntryKind } from '@/lib/types';
export const dynamic='force-dynamic';
const kinds:Record<string,EntryKind>={services:'service',cases:'case',news:'news'};
export async function generateMetadata({params}:{params:Promise<{collection:string;slug:string}>}){const p=await params;const s=await getSite();const e=(await getEntries(kinds[p.collection])).find(e=>e.slug===p.slug);return{title:e?`${e.data.seoTitle||plain(e.data.title)} · ${s.name}`:s.name,description:e?.data.seoDescription||plain(e?.data.summary),icons:{icon:s.favicon},openGraph:{images:e?.data.cover?[e.data.cover]:[s.shareImage]}}}
export default async function Page({params}:{params:Promise<{collection:string;slug:string}>}){const p=await params;const kind=kinds[p.collection];if(!kind)notFound();const e=(await getEntries(kind)).find(e=>e.slug===p.slug);if(!e)notFound();const site=await getSite();return <Website site={site}><EntryDetail entry={e} site={site}/></Website>}
