import { login, logout, changePassword, requestIp, HttpError } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await context.params;
    if (action === 'logout') { await logout(); return Response.json({ ok: true }); }
    const body = await request.json();
    if (action === 'login') {
      const result = await login(String(body.username || ''), String(body.password || ''), requestIp(request));
      return Response.json(result, { status: 'status' in result ? result.status : 200, headers: 'retry' in result && result.retry ? { 'Retry-After': String(result.retry) } : {} });
    }
    if (action === 'password') { await changePassword(String(body.oldPassword || ''), String(body.newPassword || '')); return Response.json({ ok: true }); }
    throw new HttpError(404, '操作不存在。');
  } catch (error) {
    console.error('Auth:', error instanceof Error ? error.message : error);
    return Response.json({ error: error instanceof HttpError ? error.message : '暂时无法完成操作，请重试。' }, { status: error instanceof HttpError ? error.status : 500 });
  }
}
