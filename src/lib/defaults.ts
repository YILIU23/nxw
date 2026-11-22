import type { SiteConfig, Section, EntryContent } from './types';
import { policeFilingDefaults } from './site-config';

export const sectionNames = { hero: '首屏', services: '业务服务', cases: '项目案例', about: '关于柠汐', news: '企业动态', contact: '联系区域', text: '自由内容' };
export const entryNames = { service: '业务服务', case: '项目案例', news: '企业动态' };
export function newSection(kind: Section['kind'], id: string): Section {
  return { id, kind, enabled: true, eyebrow: '', title: `<p>${sectionNames[kind]}</p>`, body: '', image: '', buttonLabel: '', buttonHref: '', secondaryLabel: '', secondaryHref: '', items: [] };
}
export const emptyEntry: EntryContent = { title: '', summary: '', body: '', cover: '', category: '', seoTitle: '', seoDescription: '', externalHref: '', featured: false, order: 0, date: '' };
export const defaultSite: SiteConfig = {
  name: '柠汐网络科技', title: '柠汐网络科技',
  description: '柠汐网络科技，提供网站建设、软件开发与技术维护服务。',
  logo: '/brand/logo.png', mark: '/brand/mark.png', favicon: '/brand/favicon.png', shareImage: '/brand/share.jpg',
  navigation: [
    { id: 'n1', label: '<p>业务服务</p>', href: '/#services', enabled: true },
    { id: 'n2', label: '<p>关于柠汐</p>', href: '/#about', enabled: true },
    { id: 'n3', label: '<p>联系我们</p>', href: '/#contact', enabled: true },
  ],
  navButtonLabel: '<p>联系柠汐</p>', navButtonHref: '/#contact',
  sections: [
    { ...newSection('hero', 'home'), eyebrow: '<p>柠汐网络科技 · 3 项技术服务</p>', title: '<p>企业网站与软件，</p><p>从想法到上线。</p>', body: '<p>网站建设、软件开发、技术维护。</p><p>让业务需求成为可以使用的数字产品。</p>', buttonLabel: '<p>联系柠汐</p>', buttonHref: '/#contact', secondaryLabel: '<p>查看业务服务</p>', secondaryHref: '/#services', items: [] },
    { ...newSection('services', 'services'), eyebrow: '<p>我们的业务</p>', title: '<p>围绕业务，做好开发。</p>', body: '<p>从企业展示到日常业务系统，按实际需求设计、开发与维护。</p>', items: [
      { id: 's1', title: '<p>网站建设</p>', body: '<p>企业官网、品牌展示与内容管理。兼顾桌面和手机，让信息清楚呈现。</p>', image: '', href: '', enabled: true },
      { id: 's2', title: '<p>软件开发</p>', body: '<p>梳理业务流程，开发适合团队使用的软件与管理系统。</p>', image: '', href: '', enabled: true },
      { id: 's3', title: '<p>技术维护</p>', body: '<p>网站更新、问题排查与日常维护，让已上线的系统持续可用。</p>', image: '', href: '', enabled: true },
    ] },
    { ...newSection('cases', 'cases'), enabled: false, title: '<p>项目案例</p>', body: '<p>看看需求如何落地。</p>', buttonLabel: '<p>查看项目案例</p>', buttonHref: '/cases' },
    { ...newSection('about', 'about'), eyebrow: '<p>关于柠汐</p>', title: '<p>技术服务，</p><p>落在具体的事情上。</p>', body: '<p>柠汐网络科技专注网站建设、软件开发与技术维护。</p><p>从页面中的一次点击，到系统中的一段流程，我们关注产品实际如何使用。</p>', buttonLabel: '<p>联系柠汐</p>', buttonHref: '/#contact', items: [] },
    { ...newSection('news', 'news'), enabled: false, title: '<p>企业动态</p>', buttonLabel: '<p>查看企业动态</p>', buttonHref: '/news' },
    { ...newSection('contact', 'contact'), eyebrow: '<p>联系我们</p>', title: '<p>从你的项目聊起。</p>', body: '<p>网站建设、软件开发，或是已有系统的技术维护。</p><p>告诉我们你正在做什么，以及需要解决的问题。</p>' },
  ],
  contact: { phone: '', email: '', address: '', wechat: '', qr: '', links: [] },
  footer: { title: '<p>柠汐</p><p>网络科技</p>', body: '<p>网站建设 / 软件开发 / 技术维护</p>', copyright: '<p>© {year} 柠汐网络科技</p>', links: [], filingEnabled: false, filingText: '', filingHref: '', filingNewTab: true, ...policeFilingDefaults },
  notFound: { title: '<p>这个页面没有找到。</p>', body: '<p>你可以回到首页，继续了解柠汐网络科技。</p>', button: '<p>返回首页</p>' },
};
