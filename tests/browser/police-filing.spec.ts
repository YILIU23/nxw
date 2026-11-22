import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { pool } from '../../src/lib/db';

test('公安备案：后台富文本、草稿发布、全局链接与手机换行', async ({ page, context }) => {
  page.setDefaultTimeout(15_000);
  const initial = (await pool.query('SELECT draft,published,published_at FROM site WHERE id=1')).rows[0];
  const text = '公安备案功能验证编号';
  const href = 'https://example.com/police-filing-browser-check';
  const visitor = await context.newPage();
  try {
    await page.goto('/admin/login');
    await page.getByLabel('账号', { exact: true }).fill(process.env.ADMIN_USERNAME || 'admin');
    await page.getByLabel('密码', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL('/admin');
    await page.getByRole('button', { name: '网站设置', exact: true }).click();
    await page.getByRole('tab', { name: '页脚与备案', exact: true }).click();
    await page.getByLabel('显示公安备案号').check();
    const editor = page.getByRole('textbox', { name: '公安备案号', exact: true });
    await editor.fill(text);
    await editor.press('Control+a');
    await page.getByRole('toolbar', { name: '公安备案号格式工具' }).getByRole('button', { name: '加粗', exact: true }).click();
    await page.getByRole('textbox', { name: '公安备案跳转链接' }).fill(href);
    await page.getByLabel('在新窗口打开公安备案链接', { exact: true }).check();
    // Exercise both registrations together, including long numbers on narrow screens.
    await page.getByLabel('显示网站备案号').check();
    await page.getByRole('textbox', { name: '备案号', exact: true }).fill('网站备案功能验证编号');
    await page.getByRole('textbox', { name: '备案跳转链接', exact: true }).fill('https://example.com/filing-browser-check');
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('草稿已保存');
    const draft = (await (await page.request.get('/api/admin/site')).json()).draft;
    expect(draft.footer.policeFilingText).toContain(`<strong>${text}</strong>`);
    await visitor.goto('/');
    await expect(visitor.locator('.police-filing')).toHaveCount(0);
    await visitor.goto('/preview');
    await expect(visitor.locator('.police-filing')).toContainText(text);
    await page.getByRole('button', { name: '发布网站', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('网站已发布');
    for (const width of [1440, 1024, 768, 390, 320]) {
      await visitor.setViewportSize({ width, height: width >= 1024 ? 900 : 844 });
      await visitor.goto('/');
      const link = visitor.locator('.police-filing');
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link.locator('strong')).toHaveText(text);
      expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const bounds = await link.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      if (width <= 390) {
        const previous = await visitor.locator('.legal>a:not(.police-filing)').boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(previous!.y + previous!.height + 8);
      }
      if (width === 1440 || width === 390) await visitor.screenshot({ path: `.taste-skill/shots/police-footer-${width}.png` });
    }
    await page.getByLabel('显示公安备案号').uncheck();
    await page.getByRole('button', { name: '发布网站', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('网站已发布');
    await visitor.reload();
    await expect(visitor.locator('.police-filing')).toHaveCount(0);
    await expect(visitor.locator('.legal')).toContainText('网站备案功能验证编号');
    const saved = (await (await page.request.get('/api/admin/site')).json()).draft;
    expect(saved.footer.policeFilingHref).toBe(href);
  } finally {
    await pool.query('UPDATE site SET draft=$1,published=$2,published_at=$3,revision=revision+1 WHERE id=1', [JSON.stringify(initial.draft), JSON.stringify(initial.published), initial.published_at]);
    await page.request.post('/api/auth/logout').catch(() => {});
    await visitor.close();
    await pool.end();
  }
});
