import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/auth';
import { getSite,getEntries } from '@/lib/content';
import { Website,Home } from '@/components/public/Website';
import { EntryDetail } from '@/components/public/EntryDetail';
export const dynamic='force-dynamic';
export const metadata={title:'草稿预览 · 柠汐',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{entry?:string}>}){if(!await currentAdmin())redirect('/admin/login');const site=await getSite(true);const entries=await getEntries(undefined,true);const {entry}=await searchParams;const selected=entry?entries.find(e=>e.id===entry):null;return <Website site={site} preview>{selected?<EntryDetail site={site} entry={selected}/>:<Home site={site} entries={entries}/>}</Website>}
