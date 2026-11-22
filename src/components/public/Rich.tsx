import { isRichEmpty } from '@/lib/rich';
export function Rich({ html = '', className = '', as = 'div', ...props }: { html?: string; className?: string; as?: 'div' | 'h1' | 'h2' | 'h3' | 'span'; [key: string]: unknown }) {
  if (isRichEmpty(html)) return null;
  const Tag = as;
  const value = as === 'h1' || as === 'h2' || as === 'h3' || as === 'span'
    ? html.replace(/<(p|h[1-6])(?:\s[^>]*)?>/gi, '<span class="rich-line">').replace(/<\/(p|h[1-6])>/gi, '</span>').replace(/<(ul|ol|li|blockquote|pre|table|tr|td|th|thead|tbody)[^>]*>/gi, '<span>').replace(/<\/(ul|ol|li|blockquote|pre|table|tr|td|th|thead|tbody)>/gi, '</span>') : html;
  return <Tag className={`rich ${className}`} {...props} dangerouslySetInnerHTML={{ __html: value }} />;
}
