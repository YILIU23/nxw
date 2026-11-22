import { getSite } from '@/lib/content';
import { Website } from '@/components/public/Website';
import { Rich } from '@/components/public/Rich';
import { plain } from '@/lib/rich';
export default async function NotFound(){const site=await getSite();return <Website site={site}><main id="top" className="collection-page"><div className="wrap"><div className="empty-collection"><span className="eyebrow">404</span><Rich html={site.notFound.title} as="h1"/><Rich html={site.notFound.body}/><a className="btn btn--primary" href="/">{plain(site.notFound.button)}</a></div></div></main></Website>}
