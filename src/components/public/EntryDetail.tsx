import { ArrowLeft } from 'lucide-react';
import { Rich } from './Rich';
import { entryNames } from '@/lib/defaults';
import { plain, safeHref } from '@/lib/rich';
import type { Entry, SiteConfig } from '@/lib/types';

export function EntryDetail({entry:e,site}:{entry:Entry;site:SiteConfig}){const base=e.kind==='case'?'cases':e.kind==='service'?'services':'news';return <main id="top" className="detail-page"><div className="wrap"><a className="detail-back" href={`/${base}`}><ArrowLeft size={16}/>返回{entryNames[e.kind]}</a><div className="detail-head"><Rich html={e.data.title} as="h1"/><Rich html={e.data.summary} className="detail-summary"/><div className="detail-meta"><span>{e.data.category}</span>{e.data.date&&<time dateTime={e.data.date}>{e.data.date.slice(0,10)}</time>}</div></div>{e.data.cover&&<img className="detail-cover" src={e.data.cover} alt={plain(e.data.title)}/>}<Rich html={e.data.body} className="rich-body"/>{safeHref(e.data.externalHref)&&<a className="btn btn--secondary" href={safeHref(e.data.externalHref)} target="_blank" rel="noreferrer">访问项目</a>}</div></main>}
