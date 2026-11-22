import sanitize from 'sanitize-html';

// Normalizes editor HTML to the formatting supported by the public renderer.
export function cleanContent<T>(value: T): T {
  if (typeof value === 'string' && /<[^>]*>/.test(value)) return sanitize(value, {
    allowedTags: ['p','br','span','strong','em','s','u','h1','h2','h3','h4','ul','ol','li','blockquote','pre','code','hr','a','img','table','tbody','thead','tr','th','td','colgroup','col'],
    allowedAttributes: { '*': ['style'], a: ['href','target','rel'], img: ['src','alt','title','width','height'], td: ['colspan','rowspan','colwidth'], th: ['colspan','rowspan','colwidth'], col: ['span','width'] },
    allowedStyles: { '*': { color: [/^#[0-9a-f]{3,8}$/i,/^rgb\([\d,\s]+\)$/i], 'text-align': [/^(left|center|right|justify)$/] } },
    allowedSchemes: ['http','https','mailto','tel'],
  }) as T;
  if (Array.isArray(value)) return value.map(cleanContent) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cleanContent(v)])) as T;
  return value;
}
