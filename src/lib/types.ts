export type RichText = string;
export type LinkItem = { id: string; label: RichText; href: string; enabled: boolean; newTab?: boolean };
export type SectionKind = 'hero' | 'services' | 'cases' | 'about' | 'news' | 'contact' | 'text';
export type ContentItem = { id: string; title: RichText; body: RichText; image: string; href: string; enabled: boolean };
export type Section = {
  id: string; kind: SectionKind; enabled: boolean; eyebrow: RichText;
  title: RichText; body: RichText; image: string; buttonLabel: RichText; buttonHref: string;
  secondaryLabel: RichText; secondaryHref: string; items: ContentItem[];
};
export type SiteConfig = {
  name: string; title: string; description: string; logo: string; mark: string; favicon: string; shareImage: string;
  navigation: LinkItem[]; navButtonLabel: RichText; navButtonHref: string;
  sections: Section[];
  contact: { phone: string; email: string; address: RichText; wechat: string; qr: string; links: LinkItem[] };
  footer: { title: RichText; body: RichText; copyright: RichText; links: LinkItem[];
    filingEnabled: boolean; filingText: string; filingHref: string; filingNewTab: boolean;
    policeFilingEnabled: boolean; policeFilingText: RichText; policeFilingHref: string; policeFilingNewTab: boolean };
  notFound: { title: RichText; body: RichText; button: RichText };
};
export type EntryKind = 'service' | 'case' | 'news';
export type EntryContent = {
  title: RichText; summary: RichText; body: RichText; cover: string; category: string;
  seoTitle: string; seoDescription: string; externalHref: string; featured: boolean; order: number; date: string;
};
export type Entry = {
  id: string; kind: EntryKind; slug: string; data: EntryContent; published_data: EntryContent | null;
  published_at: string | null; updated_at: string; revision: number;
};
export type MediaFile = {
  id: string; name: string; storage_name: string; mime: string; size: number; folder_id: string | null;
  alt: string; thumbnail: string | null; created_at: string; url: string; thumbnailUrl: string | null; references?: string[];
};
export type Folder = { id: string; name: string; parent_id: string | null };
export type AdminData = { draft: SiteConfig; published: SiteConfig; revision: number; published_at: string | null; updated_at: string; entries: Entry[]; username: string };
