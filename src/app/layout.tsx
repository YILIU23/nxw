import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { metadataBase: new URL(process.env.APP_ORIGIN || 'http://localhost:8444'), title: '柠汐网络科技', description: '网站建设、软件开发、技术维护。', icons: { icon: '/brand/favicon.png' } };
export const dynamic = 'force-dynamic';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN" data-type="software" data-radius="soft" data-buttons="solid" data-motion="" suppressHydrationWarning><body>{children}</body></html>;
}
