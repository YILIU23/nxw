import 'dotenv/config';
import { test,expect } from '@playwright/test';
import type { AdminData,MediaFile } from '../../src/lib/types';
import { readFile } from 'node:fs/promises';

test('管理端登录、富文本、素材上传、保存与移动布局',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/admin/login');
  await page.getByLabel('账号',{exact:true}).fill(process.env.ADMIN_USERNAME||'admin');
  await page.getByLabel('密码',{exact:true}).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page).toHaveURL('/admin');
  await expect(page.getByRole('heading',{name:'工作台',exact:true})).toBeVisible();
  await page.screenshot({path:'.taste-skill/shots/admin-desktop.png',fullPage:true});
  const initial=await (await page.request.get('/api/admin/site')).json() as AdminData;
  let uploaded:MediaFile|undefined;
  try{
    await page.locator('.sidebar-item').filter({hasText:'首页区域'}).click();
    const heading=page.getByRole('textbox',{name:'区域标题',exact:true});await expect(heading).toBeVisible();
    await heading.fill('浏览器验证标题');await heading.press('Control+a');
    await page.getByRole('toolbar',{name:'区域标题格式工具'}).getByRole('button',{name:'加粗',exact:true}).click();
    await page.getByRole('button',{name:'选择或上传素材',exact:true}).click();
    const picker=page.getByRole('dialog',{name:'选择素材'});await expect(picker).toBeVisible();
    const filechooser=page.waitForEvent('filechooser');await picker.getByRole('button',{name:'上传文件',exact:true}).click();
    await (await filechooser).setFiles({name:'browser-verification-logo.png',mimeType:'image/png',buffer:await readFile('public/brand/mark.png')});
    await expect(picker.getByText('已上传 1 个文件。')).toBeVisible();
    const files=await (await page.request.get('/api/admin/files?q=browser-verification-logo')).json();uploaded=files.files[0];
    await picker.getByRole('button',{name:'选择 browser-verification-logo.png',exact:true}).click();
    await expect(picker).not.toBeVisible();
    await page.getByRole('button',{name:'保存草稿',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('草稿已保存');
    const saved=await (await page.request.get('/api/admin/site')).json();
    expect(saved.draft.sections[0].title).toContain('<strong>浏览器验证标题</strong>');
    expect(saved.draft.sections[0].image).toBe(uploaded!.url);
    await page.getByRole('button',{name:'文件管理',exact:true}).click();
    await page.getByRole('button',{name:'新建文件夹',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'新建文件夹'});const folderName=dialog.getByLabel('文件夹名称');
    await folderName.pressSequentially('browser-folder',{delay:25});await expect(folderName).toHaveValue('browser-folder');
    await dialog.getByRole('button',{name:'取消',exact:true}).click();
    await page.screenshot({path:'.taste-skill/shots/admin-files.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'打开菜单',exact:true}).click();
    await page.getByRole('button',{name:'工作台',exact:true}).click();
    await expect(page.locator('.admin-sidebar')).not.toHaveClass(/open/);
    await expect.poll(()=>page.locator('.admin-sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(1);
    await expect(page.getByRole('heading',{name:'工作台',exact:true})).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:'.taste-skill/shots/admin-mobile.png',fullPage:true});
    expect(errors).toEqual([]);
  }finally{
    const latest=await (await page.request.get('/api/admin/site')).json();
    await page.request.put('/api/admin/site',{data:{data:initial.draft,revision:latest.revision}});
    if(uploaded)await page.request.delete(`/api/admin/files/${uploaded.id}`);
    await page.request.post('/api/auth/logout');
  }
});
