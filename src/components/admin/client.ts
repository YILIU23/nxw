export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { cache: 'no-store', ...options, headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !path.includes('/api/auth/')) window.location.assign('/admin/login');
    throw new Error(result.error || result.errors?.join('；') || '操作失败，请重试。');
  }
  return result as T;
}
export function formatBytes(bytes: number) { return bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`; }
