export function plain(value: string = '') { return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim(); }
export function isRichEmpty(value: string = '') { return !plain(value) && !/<img\b/.test(value); }
export function safeHref(href: string = '') { const value = href.trim(); return /^(https?:\/\/|mailto:|tel:|\/[^/]|#)/i.test(value) ? value : ''; }
