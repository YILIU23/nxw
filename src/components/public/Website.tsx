import Script from 'next/script';
import { ArrowUpRight, ArrowRight, Globe2, Layers3, MoveUpRight, Plus, Code2, Check, Mail, Phone } from 'lucide-react';
import { Rich } from './Rich';
import { plain, safeHref, isRichEmpty } from '@/lib/rich';
import type { SiteConfig, Entry, Section } from '@/lib/types';
import './website.css';

export function Action({ label, href, secondary = false }: { label: string; href: string; secondary?: boolean }) {
  const target = safeHref(href); if (!target || isRichEmpty(label)) return null;
  return <a className={`btn ${secondary ? 'btn--secondary' : 'btn--primary'}`} href={target}><span>{plain(label)}</span>{!secondary && <ArrowUpRight className="m-arrow" size={17} aria-hidden="true" />}</a>;
}
export function Website({ site, children, preview = false }: { site: SiteConfig; children: React.ReactNode; preview?: boolean }) {
  return <>
    <link rel="stylesheet" href="/assets/system.css" precedence="base" />
    <link rel="stylesheet" href="/assets/ui/cards.css" precedence="base" />
    <link rel="stylesheet" href="/assets/motion/motion.css" precedence="base" />
    <link rel="stylesheet" href="/assets/layout/layout.css" precedence="base" />
    <header className="nav nav--centre"><div className="wrap nav__bar">
      <a className="skip-link" href="#top">跳转到主要内容</a>
      <a className="nav__logo" href="/" aria-label={`${site.name}首页`}>{site.logo?<img loading="lazy" className="full-logo" src={site.logo} alt={site.name} width="190" height="60"/>:<><img loading="lazy" src={site.mark} alt="" width="38" height="38"/><span>{site.name}</span></>}</a>
      <nav className="nav__links" aria-label="主要导航">{site.navigation.filter(n => n.enabled && safeHref(n.href)).map(n => <div className="nav__item" key={n.id}><a className="nav__link" href={safeHref(n.href)} target={n.newTab ? '_blank' : undefined} rel={n.newTab ? 'noreferrer' : undefined}>{plain(n.label)}</a></div>)}</nav>
      <div className="nav__actions"><Action label={site.navButtonLabel} href={site.navButtonHref} /></div>
      <button className="nav__toggle" aria-label="打开导航菜单" aria-expanded="false" type="button"><span /><span /></button>
    </div></header>
    {preview && <div className="preview-strip">草稿预览 · 仅管理员可见 <a href="/admin">返回管理端</a></div>}
    {children}
    <footer className="closing footer--dark"><div className="wrap">
      <div className="footer-brand"><div><Rich html={site.footer.title} as="h2" /><Rich html={site.footer.body} className="footer-intro" /></div><img loading="lazy" src={site.mark} width="320" height="320" alt="" /></div>
      <div className="footer-directory"><div className="footer-links">{site.footer.links.filter(n=>n.enabled && safeHref(n.href)).map(n=><a href={safeHref(n.href)} key={n.id} target={n.newTab ? '_blank' : undefined} rel={n.newTab ? 'noreferrer' : undefined}>{plain(n.label)}</a>)}</div><div className="legal">
        <Rich html={site.footer.copyright.replaceAll('{year}', String(new Date().getFullYear()))} />
        {site.footer.filingEnabled && safeHref(site.footer.filingHref) && <a href={safeHref(site.footer.filingHref)} target={site.footer.filingNewTab ? '_blank' : undefined} rel={site.footer.filingNewTab ? 'noreferrer' : undefined}>{site.footer.filingText}</a>}
        {site.footer.policeFilingEnabled && plain(site.footer.policeFilingText) && safeHref(site.footer.policeFilingHref) && <a className="police-filing" href={safeHref(site.footer.policeFilingHref)} target={site.footer.policeFilingNewTab ? '_blank' : undefined} rel={site.footer.policeFilingNewTab ? 'noreferrer' : undefined}><Rich as="span" html={site.footer.policeFilingText} /></a>}
      </div></div>
    </div></footer>
    <Script id="taste-ready" strategy="afterInteractive">{`document.documentElement.classList.add('mo-js');document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)`}</Script>
    <Script src="/assets/system.js" type="module" strategy="afterInteractive" />
    <Script src="/assets/motion/motion.js" type="module" strategy="afterInteractive" />
    <Script src="/assets/layout/layout.js" type="module" strategy="afterInteractive" />
  </>;
}

function BrowserVisual({ site, image }: { site: SiteConfig; image: string }) {
  if (image) return <div className="hero__window own-visual" data-visual><img loading="lazy" src={image} alt={`${site.name}业务展示`} /></div>;
  const services = site.sections.find(s=>s.kind==='services')?.items.filter(i=>i.enabled) || [];
  return <div className="hero__window work-surface" data-visual role="img" aria-label="柠汐品牌网站与软件界面展示">
    <div className="studio-window app-frame ui">
      <div className="window-chrome"><span className="window-dots"><i /><i /><i /></span><span>{site.name}</span><Globe2 size={13} /></div>
      <div className="window-content"><div className="mini-nav"><img loading="lazy" src={site.mark} width="27" height="27" alt="" /><span>{site.name}</span><span className="mini-nav-right">{services.map(s=>plain(s.title)).join(' / ')}</span></div>
        <div className="mini-hero"><div><span className="mini-kicker">{services.length} 项技术服务</span><strong>{plain(site.sections.find(s=>s.kind==='hero')?.title || site.title)}</strong><div className="mini-link">{plain(site.navButtonLabel)}<ArrowUpRight size={15} /></div></div><div className="brand-orbit"><img loading="lazy" src={site.mark} alt="" width="184" height="184" /></div></div>
      </div>
    </div>
  </div>;
}
function ServiceVisual({ index, mark }: { index: number; mark: string }) {
  return <div className={`service-art frame ui service-art-${index%3}`} data-visual role="img" aria-label="业务界面示意">
    {index%3===0 ? <div className="web-fragment"><div className="fragment-top"><img loading="lazy" src={mark} alt="" width="20" height="20" /><span /><i /></div><div className="fragment-content"><div className="abstract-heading" /><div className="abstract-heading short" /><div className="abstract-line" /><div className="abstract-button" /></div><div className="fragment-blocks"><i /><i /><i /></div></div> : index%3===1 ? <div className="code-fragment"><div className="code-head"><Code2 size={16} /><span>software</span></div><div className="code-lines"><span><b>const</b> idea = your.business</span><span> </span><span><b>function</b> build(idea) {'{'}</span><span>　<b>return</b> create(idea)</span><span>{'}'}</span><span> </span><span className="code-last"><i /> 从需求到实际应用</span></div></div> : <div className="care-fragment"><div className="care-title"><Layers3 size={20}/><span>持续维护</span></div><div className="care-row"><span>内容与页面更新</span><Check size={16} /></div><div className="care-row"><span>功能调整与迭代</span><Check size={16} /></div><div className="care-row"><span>系统问题排查</span><Check size={16} /></div></div>}
  </div>;
}
function EntryTiles({ entries }: { entries: Entry[] }) {
  return <div className="entry-grid">{entries.map(e=><a className="card entry-card m-zoom" key={e.id} href={`/${e.kind==='case'?'cases':e.kind==='service'?'services':'news'}/${e.slug}`}>
    {e.data.cover && <div className="entry-cover"><img src={e.data.cover} alt={plain(e.data.title)} loading="lazy" /></div>}
    <div className="entry-meta"><span>{e.data.category || (e.kind==='news' ? '企业动态' : '项目案例')}</span><ArrowUpRight size={20} /></div><Rich as="h3" html={e.data.title}/><Rich html={e.data.summary}/>{e.kind==='news' && e.data.date && <time dateTime={e.data.date}>{e.data.date.slice(0,10)}</time>}
  </a>)}</div>;
}
function ContentSection({ section: s, site, entries }: { section: Section; site: SiteConfig; entries: Entry[] }) {
  const items = s.items.filter(i=>i.enabled);
  if (s.kind === 'hero') return <section id={s.id} className="hero hero--centred" data-enter aria-labelledby={`${s.id}-title`}><div className="wrap"><div className="hero-text"><div className="hero__c"><Rich html={s.eyebrow} className="eyebrow hero-eyebrow" /><Rich html={s.title} as="h1" id={`${s.id}-title`} /><Rich html={s.body} className="hero__lead" /><div className="btn-row"><Action label={s.buttonLabel} href={s.buttonHref}/><Action label={s.secondaryLabel} href={s.secondaryHref} secondary/></div></div><BrowserVisual site={site} image={s.image}/></div></div></section>;
  if (s.kind === 'services') return <section id={s.id} className="section services-section" style={{'--h':1,'--hm':2} as React.CSSProperties}><div className="wrap"><Rich html={s.title} as="h2"/><div className="section-head"><Rich html={s.body}/><Rich html={s.eyebrow} className="eyebrow" /></div><div className="service-grid">{items.map((item,i)=>{
    const detail=entries.find(e=>e.kind==='service' && (plain(e.data.title)===plain(item.title) || safeHref(item.href)===`/services/${e.slug}`)); const href = safeHref(item.href) || (detail ? `/services/${detail.slug}` : '');
    const inner=<><div className="service-label"><Rich html={item.title} as="h3"/>{href ? <ArrowUpRight size={22}/> : <Plus size={20}/>}</div><Rich html={item.body} className="service-description"/>{item.image ? <div className="service-art" data-visual><img src={item.image} alt={plain(item.title)} loading="lazy"/></div> : <ServiceVisual index={i} mark={site.mark}/>}</>;
    return href ? <a href={href} className="card service-card" key={item.id}>{inner}</a> : <article className="card service-card m-nolift" key={item.id}>{inner}</article>;
  })}</div><div className="section-actions"><Action label={s.buttonLabel} href={s.buttonHref} secondary/></div></div></section>;
  if (s.kind === 'cases' || s.kind === 'news') {
    const selected=entries.filter(e=>e.kind===(s.kind==='cases'?'case':'news')).slice(0,3);
    if(!selected.length && !items.length) return null;
    return <section id={s.id} className="section entries-section" style={{'--h':1,'--hm':2} as React.CSSProperties}><div className="wrap"><Rich html={s.title} as="h2"/><div className="section-head"><Rich html={s.body}/><Action label={s.buttonLabel} href={s.buttonHref} secondary/></div><EntryTiles entries={selected}/>{items.length>0 && <div className="entry-grid">{items.map(i=><article className="card entry-card" key={i.id}>{i.image&&<img src={i.image} alt={plain(i.title)} loading="lazy"/>}<Rich html={i.title} as="h3"/><Rich html={i.body}/>{safeHref(i.href)&&<a className="link" href={safeHref(i.href)}>查看详情<ArrowUpRight size={16}/></a>}</article>)}</div>}</div></section>;
  }
  if (s.kind === 'about') return <section id={s.id} className="section about-section" style={{'--h':1,'--hm':1} as React.CSSProperties}><div className="wrap"><Rich html={s.title} as="h2" data-moment="liquid-type" data-moment-opts='{"strength":0.35}'/><div className="about-content"><div className="about-copy"><Rich html={s.eyebrow} className="eyebrow"/><Rich html={s.body} className="about-text"/><div className="btn-row"><Action label={s.buttonLabel} href={s.buttonHref}/></div>{items.map(i=><div className="about-item" key={i.id}><Rich html={i.title} as="h3"/><Rich html={i.body}/></div>)}</div><div className="brand-art frame" data-visual role="img" aria-label={site.name}>{s.image ? <img src={s.image} alt={plain(s.title)} loading="lazy"/> : <><img loading="lazy" src={site.mark} alt="" width="268" height="268"/></>}</div></div></div></section>;
  if (s.kind === 'contact') return <section id={s.id} className="section contact-section" style={{'--h':1,'--hm':1} as React.CSSProperties}><div className="wrap"><Rich html={s.title} as="h2"/><div className="contact-content"><div><Rich html={s.eyebrow} className="eyebrow"/><Rich html={s.body} className="contact-copy"/><div className="contact-methods">{site.contact.email && <a className="contact-link" href={`mailto:${site.contact.email}`}><span><Mail size={18}/>电子邮箱</span><strong>{site.contact.email}</strong><ArrowUpRight size={20}/></a>}{site.contact.phone && <a className="contact-link" href={`tel:${site.contact.phone}`}><span><Phone size={18}/>联系电话</span><strong>{site.contact.phone}</strong><ArrowUpRight size={20}/></a>}{site.contact.wechat&&<div className="contact-link"><span>微信</span><strong>{site.contact.wechat}</strong></div>}{site.contact.address&&<div className="contact-address"><Rich html={site.contact.address}/></div>}{site.contact.links.filter(l=>l.enabled&&safeHref(l.href)).map(l=><a key={l.id} className="contact-link" href={safeHref(l.href)} target={l.newTab?'_blank':undefined} rel={l.newTab?'noreferrer':undefined}><strong>{plain(l.label)}</strong><ArrowUpRight size={20}/></a>)}</div><div className="btn-row"><Action label={s.buttonLabel} href={s.buttonHref}/></div></div><div className="contact-art frame" data-visual>{site.contact.qr ? <img loading="lazy" src={site.contact.qr} alt="联系柠汐微信二维码" width="256" height="256"/> : s.image ? <img loading="lazy" src={s.image} alt="联系柠汐"/> : <><span className="contact-plus"><Plus strokeWidth={.8}/></span><span className="contact-word">{site.name}</span><MoveUpRight strokeWidth={.8} className="contact-arrow"/></>}</div></div></div></section>;
  return <section id={s.id} className="section text-section" style={{'--h':1} as React.CSSProperties}><div className="wrap"><Rich html={s.title} as="h2"/><Rich html={s.eyebrow} className="eyebrow"/><div className="text-content rich-body"><Rich html={s.body}/>{s.image&&<img loading="lazy" src={s.image} alt={plain(s.title)}/>}</div>{items.map(i=><article key={i.id}><Rich html={i.title} as="h3"/><Rich html={i.body}/>{i.image&&<img loading="lazy" src={i.image} alt={plain(i.title)}/>}</article>)}<Action label={s.buttonLabel} href={s.buttonHref}/></div></section>;
}
export function Home({ site, entries }: { site: SiteConfig; entries: Entry[] }) {
  return <main id="top">{site.sections.filter(s=>s.enabled).map(s=><ContentSection key={s.id} section={s} site={site} entries={entries}/>)}</main>;
}
export { EntryTiles };
