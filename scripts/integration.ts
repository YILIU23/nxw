import 'dotenv/config';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/lib/db';
import type { AdminData,Entry,MediaFile } from '../src/lib/types';
import { emptyEntry } from '../src/lib/defaults';

const origin=process.env.APP_ORIGIN||'http://localhost:8444';
const username=process.env.ADMIN_USERNAME||'admin';const password=process.env.ADMIN_PASSWORD!;
let cookie='';let checks=0;let initial:AdminData|undefined;let createdEntry:string|undefined;let file:MediaFile|undefined;let folderId:string|undefined;let passwordChanged=false;
const marker=`verification-${Date.now().toString(36)}`;
async function request(path:string,method='GET',body?:unknown,authenticated=true){const response=await fetch(`${origin}${path}`,{method,redirect:'manual',headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...(authenticated&&cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});const text=await response.text();let data:any;try{data=JSON.parse(text);}catch{data=text;}return {response,status:response.status,data,text};}
function expect(value:unknown,message:string){assert.ok(value,message);checks++;}
async function auth(pass=password){const r=await request('/api/auth/login','POST',{username,password:pass},false);if(r.status===200)cookie=r.response.headers.get('set-cookie')!.split(';')[0];return r;}
async function saveSite(data:AdminData['draft'],publish=false){const latest=await request('/api/admin/site');return request('/api/admin/site','PUT',{data,revision:latest.data.revision,publish});}
try{
  expect((await request('/api/admin/site','GET',undefined,false)).status===401,'未登录的管理接口必须要求登录');
  expect([307,303].includes((await request('/admin','GET',undefined,false)).status),'管理页面跳转到登录页');
  expect((await auth('incorrect-password')).status===401,'错误密码应失败');
  let rate=await pool.query('SELECT failures FROM login_attempts WHERE username=$1 AND ip=$2',[username.toLowerCase(),'direct']);expect(rate.rows[0]?.failures===1,'错误登录累计计次');
  await request('/api/auth/logout','POST',{},false);rate=await pool.query('SELECT failures FROM login_attempts WHERE username=$1 AND ip=$2',[username.toLowerCase(),'direct']);expect(rate.rows[0]?.failures===1,'未认证退出不能清零');
  expect((await auth()).status===200,'管理员可以登录');
  rate=await pool.query('SELECT * FROM login_attempts WHERE username=$1 AND ip=$2',[username.toLowerCase(),'direct']);expect(rate.rowCount===0,'登录成功清零');
  initial=(await request('/api/admin/site')).data;expect(!!initial?.draft,'可读取后台内容');
  const page=await request('/', 'GET',undefined,false);expect(page.status===200,'官网首页正常');expect(page.response.headers.get('cache-control')?.includes('no-store'),'首页明确不缓存');
  const draft=structuredClone(initial!.draft);draft.sections[0].body=`<p>${marker}-draft</p>`;
  expect((await saveSite(draft)).status===200,'保存网站草稿');
  expect(!(await request('/','GET',undefined,false)).text.includes(`${marker}-draft`),'草稿不出现在官网');
  expect((await request('/preview')).text.includes(`${marker}-draft`),'管理员可预览草稿');
  expect([307,303].includes((await request('/preview','GET',undefined,false)).status),'访客无法预览草稿');
  draft.footer.policeFilingEnabled=true;draft.footer.policeFilingText=`<p><strong>${marker}-公安备案号</strong></p>`;draft.footer.policeFilingHref=`https://example.com/police-record/${marker}`;draft.footer.policeFilingNewTab=true;
  expect((await saveSite(draft)).status===200,'公安备案配置可保存为草稿');
  expect(!(await request('/','GET',undefined,false)).text.includes(`${marker}-公安备案号`),'公安备案草稿不影响官网');
  expect((await request('/preview')).text.includes(`${marker}-公安备案号`),'公安备案草稿预览可见');
  const invalidPolice=structuredClone(draft);invalidPolice.footer.policeFilingHref='';
  expect((await saveSite(invalidPolice)).status===400,'开启公安备案但缺少跳转链接时返回提示');
  draft.footer.filingEnabled=true;draft.footer.filingText=`${marker}-备案号`;draft.footer.filingHref='https://beian.miit.gov.cn/';
  expect((await saveSite(draft,true)).status===200,'发布网站内容');
  let html=(await request('/','GET',undefined,false)).text;expect(html.includes(`${marker}-draft`),'发布后下次请求立即更新');expect(html.includes(`${marker}-备案号`),'开启备案号显示');expect(html.includes('https://beian.miit.gov.cn/'),'备案号跳转地址正确');
  expect(html.includes(`<strong>${marker}-公安备案号</strong>`),'公安备案富文本发布后显示');
  expect(html.includes(`class="police-filing" href="${draft.footer.policeFilingHref}" target="_blank"`),'公安备案链接和新窗口设置正确');
  for(const path of ['/cases','/news','/missing-police-verification-page']) expect((await request(path,'GET',undefined,false)).text.includes(`${marker}-公安备案号`),`公安备案在全局页脚生效：${path}`);
  const stale=await request('/api/admin/site','PUT',{data:draft,revision:initial!.revision,publish:false});expect(stale.status===409,'阻止旧窗口覆盖新版本');
  draft.footer.filingEnabled=false;await saveSite(draft,true);html=(await request('/','GET',undefined,false)).text;expect(!html.includes(`${marker}-备案号</a>`),'关闭备案号隐藏链接');
  expect(html.includes(`${marker}-公安备案号`),'关闭原备案不会关闭公安备案');
  draft.footer.policeFilingNewTab=false;await saveSite(draft,true);html=(await request('/','GET',undefined,false)).text;
  expect(html.includes(`class="police-filing" href="${draft.footer.policeFilingHref}"><span`),'公安备案支持当前窗口打开');
  draft.footer.policeFilingEnabled=false;draft.footer.filingEnabled=true;await saveSite(draft,true);html=(await request('/','GET',undefined,false)).text;
  expect(!html.includes('class="police-filing"'),'关闭公安备案不渲染链接和占位');
  expect(html.includes(`${marker}-备案号</a>`),'关闭公安备案不影响原备案');
  expect((await request('/api/admin/site')).data.draft.footer.policeFilingHref===draft.footer.policeFilingHref,'关闭公安备案保留已有配置');
  draft.footer.filingEnabled=false;await saveSite(draft,true);
  const entryBody={...emptyEntry,title:`<p>${marker}-案例</p>`,summary:'<p>摘要内容</p>',body:`<p><strong>${marker}-正文</strong></p>`,category:'验证分类',date:'2026-11-20'};
  let e=(await request('/api/admin/entries','POST',{kind:'case',slug:marker,data:entryBody})).data as Entry;createdEntry=e.id;expect(!!e.id,'新增案例草稿');
  expect((await request(`/cases/${marker}`,'GET',undefined,false)).status===404,'草稿详情不对外公开');
  let result=await request(`/api/admin/entries/${e.id}`,'PUT',{slug:e.slug,data:e.data,revision:e.revision,publish:true});e=result.data;expect(result.status===200,'发布案例');expect((await request(`/cases/${marker}`,'GET',undefined,false)).text.includes(`${marker}-正文`),'案例富文本正文正常展示');
  draft.footer.policeFilingEnabled=true;await saveSite(draft,true);expect((await request(`/cases/${marker}`,'GET',undefined,false)).text.includes(`${marker}-公安备案号`),'公安备案在详情页全局页脚生效');draft.footer.policeFilingEnabled=false;await saveSite(draft,true);
  result=await request(`/api/admin/entries/${e.id}`,'PUT',{slug:`${marker}-new`,data:{...e.data,title:`<p>${marker}-未发布标题</p>`},revision:e.revision});e=result.data;expect(result.status===200,'更新详情草稿路径');expect((await request(`/cases/${marker}`,'GET',undefined,false)).status===200,'修改草稿路径不影响已发布路径');expect((await request(`/cases/${marker}-new`,'GET',undefined,false)).status===404,'新草稿路径尚未公开');
  const folder=await request('/api/admin/folders','POST',{name:marker});folderId=folder.data.id;expect(folder.status===201,'创建文件夹');
  const png=await sharp({create:{width:48,height:48,channels:3,background:'#85a84c'}}).png().toBuffer();const form=new FormData();form.append('files',new File([new Uint8Array(png)],`${marker}.png`,{type:'image/png'}));form.append('folder',folderId!);
  const uploaded=await request('/api/admin/files','POST',form);file=uploaded.data.files[0];expect(uploaded.status===201&&!!file?.url,'上传图片');expect(!!file?.thumbnail,'生成缩略图');expect((await request(file!.url,'GET',undefined,false)).status===200,'公开文件地址可读取');
  let listed=await request(`/api/admin/files?folder=${folderId}`);expect(listed.data.files.some((f:MediaFile)=>f.id===file!.id),'文件夹中列出上传文件');
  expect((await request(`/api/admin/files/${file!.id}`,'PUT',{name:`${marker}-renamed.png`,alt:'测试替代文本',folder_id:null})).status===200,'文件重命名、替代文本、移动');
  listed=await request(`/api/admin/files?q=${marker}`);expect(listed.data.files.length===1,'文件搜索可用');
  const imageDraft=structuredClone(draft);imageDraft.sections[0].image=file!.url;await saveSite(imageDraft);
  expect((await request(`/api/admin/files/${file!.id}`,'DELETE')).status===409,'使用中的文件提示引用而保留');
  await saveSite(draft);expect((await request(`/api/admin/files/${file!.id}`,'DELETE')).status===200,'解除引用后可删除文件');file=undefined;
  expect((await request(`/api/admin/folders/${folderId}`,'DELETE')).status===200,'删除空文件夹');folderId=undefined;
  e=(await request(`/api/admin/entries/${e.id}`,'PUT',{slug:e.slug,data:e.data,revision:e.revision,unpublish:true})).data;expect((await request(`/cases/${marker}`,'GET',undefined,false)).status===404,'案例下架后不可访问');
  for(let i=0;i<20;i++){const r=await auth('incorrect-password');expect(r.status===(i===19?429:401),`登录限频第 ${i+1} 次`);}
  expect((await auth()).status===429,'冷却期间限制继续登录');
  await pool.query("UPDATE login_attempts SET blocked_until=now()-interval '1 second' WHERE username=$1 AND ip='direct'",[username.toLowerCase()]);
  expect((await auth()).status===200,'冷却到期可再次登录并清零');
  await auth('incorrect-password');
  const validCookie=cookie;expect((await request('/api/auth/logout','POST',{})).status===200,'正常退出登录');
  rate=await pool.query('SELECT * FROM login_attempts WHERE username=$1 AND ip=$2',[username.toLowerCase(),'direct']);expect(rate.rowCount===0,'有效退出清零登录失败次数');
  expect((await request('/api/admin/site','GET',undefined,true)).status===401,'退出后原登录态失效');
  await auth();const nextPassword=`test-${randomUUID()}`;
  expect((await request('/api/auth/password','POST',{oldPassword:password,newPassword:nextPassword})).status===200,'修改密码成功');passwordChanged=true;
  expect((await auth(nextPassword)).status===200,'新密码可以登录');
  expect((await request('/api/auth/password','POST',{oldPassword:nextPassword,newPassword:password})).status===200,'恢复初始密码');passwordChanged=false;
  console.log(`集成检查通过：${checks} 项，覆盖登录计次、草稿发布、备案、详情、文件与退出。`);
}finally{
  if(initial){await pool.query('UPDATE site SET draft=$1,published=$2,revision=revision+1,updated_at=now(),published_at=$3 WHERE id=1',[JSON.stringify(initial.draft),JSON.stringify(initial.published),initial.published_at]);}
  if(createdEntry)await pool.query('DELETE FROM entries WHERE id=$1',[createdEntry]);
  if(file){const {deleteFile}=await import('../src/lib/media');await deleteFile(file.id).catch(()=>{});}
  if(folderId)await pool.query('DELETE FROM folders WHERE id=$1',[folderId]);
  await pool.query('DELETE FROM login_attempts WHERE username=$1 AND ip=$2',[username.toLowerCase(),'direct']);
  if(passwordChanged) {const {hashPassword}=await import('../src/lib/password');await pool.query('UPDATE admins SET password_hash=$2 WHERE username=$1',[username,hashPassword(password)]);}
  if(cookie)await request('/api/auth/logout','POST',{}).catch(()=>{});
  await pool.end();
}
