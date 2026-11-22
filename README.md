# 柠汐网络科技官网

TypeScript 全栈官网，使用 Next.js 16、React 19、PostgreSQL、Tiptap 和 Sharp。网站与管理端共用一个 Node.js 服务，固定监听 **8444**。

## 本机运行

推荐 Node.js 24 LTS。首次运行：

```powershell
npm ci
Copy-Item .env.example .env
```

编辑 `.env`，设置数据库地址和初始管理员密码。如果使用已安装的 PostgreSQL，先建立一个独立数据库，再填写 `DATABASE_URL`，跳过 `db:local`。

项目提供可选的本机 PostgreSQL 工具，直接启动原生 PostgreSQL 进程，使用 `.data/postgres` 持久化数据，默认本机端口 **55444**：

```powershell
npm run db:local
npm run db:migrate
npm run db:seed
npm run dev
```

本次开发环境已经完成初始化，不需要覆盖现有 `.env`。生成的本机管理账号保存在 `.local-admin.txt`。

- 官网：http://localhost:8444
- 管理：http://localhost:8444/admin
- 草稿预览：http://localhost:8444/preview，仅已登录管理员可访问。
- 停止本机数据库：`npm run db:stop`，数据会保留。

`db:seed` 可重复执行，不覆盖现有账号、已编辑内容或已发布版本。`db:migrate` 可重复执行，当前版本为 2。

## 生产运行

已部署旧版网站增加公安备案功能，见 [2026-11-21 更新教程](UPDATE-20261121.md)。本次不需要数据库迁移或重新初始化。

Linux 服务器的安装步骤、开机自启和进程守护独立开关见 [LINUX-DEPLOY.md](LINUX-DEPLOY.md)。管理脚本为 `scripts/linux-service.sh`，使用系统自带的 systemd。

使用自行安装的 PostgreSQL，为项目建立独立数据库，填写 `.env`。执行：

```powershell
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

应用仍使用 **8444**，该端口提供 HTTP。需要域名或 HTTPS 时，在服务器反向代理中转发到 `127.0.0.1:8444`。

将 `APP_ORIGIN` 改为正式网站地址，用于生成分享图片的完整 URL；HTTPS 环境设置 `COOKIE_SECURE=true`。

`UPLOAD_DIR` 建议填写独立的绝对路径，发布新版本时保留此目录。数据保存在 PostgreSQL，上传文件不会写入构建产物。

## 内容维护

- **首页区域**：编辑首屏、服务、案例、关于、动态、联系和自由内容，添加、排序、启停区域。首屏固定在第一个位置。
- **导航菜单**：富文本编辑链接名称，设置跳转地址、排序、显隐和新窗口打开。
- **网站设置**：完整 Logo、独立图形、图标、SEO、分享图、联系方式、页脚、404 文案。
- **页脚与备案**：网站备案号与公安备案号各自配置文案、跳转链接、独立显示开关及新窗口打开。公安备案号支持富文本。关闭后不保留空位，已填内容保留；发布后全站页脚生效。
- **服务、案例、动态**：分类、封面、富文本正文、排序、推荐、草稿、预览、发布和下架。
- **文件管理**：上传、拖放、批量上传、文件夹、类型筛选、搜索、预览、下载、重命名、移动、替代文本、复制地址、批量删除、引用位置查看。
- **账号设置**：修改管理员密码。

富文本支持标题、加粗、斜体、下划线、删除线、颜色、对齐、列表、引用、链接、图片、附件链接、表格、撤销与重做。

网站设置和内容均有草稿与发布版本。保存草稿不影响官网；发布后下一次打开官网读取新内容。详情页草稿路径与已发布路径也分别保存。内容列表中的“排序”数值越小越靠前，“推荐内容”优先展示。

案例、动态初始为空且首页区域默认关闭，添加真实资料后可启用。尚未提供的电话、邮箱、地址、微信等信息保持空白，由管理端填写后发布。

## 缓存与登录频率

官网与管理数据直接查询 PostgreSQL，页面和接口使用 `no-store`。没有 Redis、内存内容缓存、ISR、CDN 内容缓存或访客账号系统。

后台采用单管理员账号，密码使用 scrypt 哈希，登录态保存在 PostgreSQL。额外登录策略只有宽松的失败限频：

- 默认 15 分钟内失败 20 次，冷却 5 分钟。
- 登录成功清零当前账号和来源的计次。
- 有效退出清零该登录态对应来源的计次，同时使当前登录态失效。
- 修改密码成功清零该账号的计次。
- 冷却到期或窗口过期后清零。
- 失败登录、刷新页面、未认证的退出请求不清零。
- 默认直接连接时按账号统一计次；可信反向代理下设置 `TRUST_PROXY=true` 后，以账号与代理提供的来源 IP 组合计次。

环境变量 `LOGIN_MAX_FAILURES`、`LOGIN_WINDOW_MINUTES`、`LOGIN_COOLDOWN_MINUTES` 控制阈值。没有验证码、双因素、黑名单和复杂权限模块。

## 备份与恢复

需要同时备份 PostgreSQL 和 `UPLOAD_DIR`。建议在暂停内容编辑时操作，保证数据库引用与文件一致。

使用安装的 PostgreSQL 自带工具：

```powershell
pg_dump -Fc -h 127.0.0.1 -p 55444 -U ningxi -d ningxi -f ningxi.dump
Copy-Item -LiteralPath .\uploads -Destination D:\backup\ningxi-uploads -Recurse
```

如使用项目本机数据库，`pg_dump.exe`、`pg_restore.exe` 位于 `node_modules/@embedded-postgres/windows-x64/native/bin`。数据库密码按工具提示输入。

恢复到一个新建的空数据库：

```powershell
pg_restore -h 127.0.0.1 -p 55444 -U ningxi -d ningxi_restored ningxi.dump
```

将上传文件恢复到新的持久化目录，修改 `DATABASE_URL`、`UPLOAD_DIR` 后重新启动应用。原库与原文件目录保留，可用于回退。

## 检查

```powershell
npm run typecheck
npm test
npm run build
npm run test:integration
npx playwright test
```

集成与浏览器检查需要网站和数据库正在运行；测试会暂时修改本机内容并在结束时恢复，适合独立开发环境。浏览器检查使用本机 Edge，按顺序执行，避免与网站截图检查同时运行。

UI 使用 design-taste-frontend skill 的设计系统与交互动效。原始 Logo `nxlogo1b1.jpg` 保留，`npm run logo` 可重新生成 `public/brand` 中的透明 PNG/WebP、独立图形、图标与分享图。业务代码为 TypeScript；Linux 服务管理脚本为 Bash；`public/assets` 为设计 skill 提供的静态运行资源。
