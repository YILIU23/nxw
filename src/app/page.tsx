import type { Metadata } from 'next';
import { getSite, getEntries } from '@/lib/content';
import { Home, Website } from '@/components/public/Website';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const s=await getSite();return {title:s.title,description:s.description,icons:{icon:s.favicon},openGraph:{title:s.title,description:s.description,type:'website',images:[s.shareImage]},twitter:{card:'summary_large_image',images:[s.shareImage]},other:{'site-kind':'software','page-type':'software','theme-color':'#f6f8f3'}};
}
export default async function Page(){const site=await getSite();const entries=await getEntries();return <Website site={site}><Home site={site} entries={entries}/></Website>}
