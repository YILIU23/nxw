import { notFound } from 'next/navigation';
import { getSite, getEntries } from '@/lib/content';
import { Website, EntryTiles } from '@/components/public/Website';
import { Rich } from '@/components/public/Rich';
import { entryNames } from '@/lib/defaults';
import type { EntryKind } from '@/lib/types';
export const dynamic='force-dynamic';
const kinds:Record<string,EntryKind>={services:'service',cases:'case',news:'news'};
export async function generateMetadata({params}:{params:Promise<{collection:string}>}){const {collection}=await params;const s=await getSite();return{title:`${entryNames[kinds[collection]] || '页面'} · ${s.name}`,icons:{icon:s.favicon}}}
export default async function Page({params}:{params:Promise<{collection:string}>}){const {collection}=await params;const kind=kinds[collection];if(!kind)notFound();const site=await getSite();const entries=await getEntries(kind);const section=site.sections.find(s=>s.kind===(kind==='case'?'cases':kind==='service'?'services':'news'));return <Website site={site}><main id="top" className="collection-page"><div className="wrap"><h1>{entryNames[kind]}</h1>{section&&<Rich html={section.body} className="detail-summary"/>}{entries.length?<EntryTiles entries={entries}/>:<div className="empty-collection"><p>目前没有已发布的内容。</p><a className="link" href="/">返回首页</a></div>}</div></main></Website>}
