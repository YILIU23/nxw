# Linux 部署与服务开关

适用于使用 systemd 的 Linux 服务器，例如 Debian、Ubuntu、Rocky Linux。需要 Bash 4+、Node.js 24+、npm、独立安装的 PostgreSQL，以及 util-linux 的 `runuser`。应用端口固定为 **8444（HTTP）**。

压缩包是源码包，需要在 Linux 上安装依赖并构建；没有携带 Windows 的依赖或构建产物。服务脚本只管理官网 Node.js 进程，PostgreSQL 请使用系统自带的数据库服务管理方式，按需启用数据库自己的开机启动。

已部署上一版官网时，直接参考 [公安备案增量更新教程](UPDATE-20261121.md)，无需重新初始化数据库。

## 1. 解压和初始化

下面以普通运行账号 `ningxi`、项目目录 `/opt/ningxi-website` 为例。若已有部署账号，可直接使用已有账号。

```bash
# 管理员执行；已有账号时跳过 useradd
sudo useradd --system --create-home --shell /bin/bash ningxi
sudo unzip ningxi-website-linux-20261121.zip -d /opt
sudo chown -R ningxi:ningxi /opt/ningxi-website
sudo -u ningxi -H bash
cd /opt/ningxi-website
cp .env.example .env
# 使用编辑器修改 .env 后继续
```

部署目录和 Node 路径支持英文字母、数字、空格及 `/._+-`。请将项目放在持久目录，后续不要直接移动。建议使用全系统可访问的 Node 安装路径，例如 `/usr/bin/node` 或 `/usr/local/bin/node`；使用 nvm 时，需填写实际 Node 路径且运行账号必须有访问权限。

在 PostgreSQL 中创建本项目独立账号与数据库。编辑 `.env`，至少填写：

- `DATABASE_URL`：实际 PostgreSQL 地址。示例中的 **55444** 是开发数据库端口；生产数据库如使用默认端口，请改成 **5432**。
- `ADMIN_USERNAME`、`ADMIN_PASSWORD`：首次初始化管理员账号与密码。
- `UPLOAD_DIR`：推荐 `/opt/ningxi-website/uploads` 或其他运行账号可写的持久目录。
- `APP_ORIGIN`：网站实际访问地址，例如 `https://你的域名`。
- `COOKIE_SECURE`：HTTPS 网站填 `true`；直接用 HTTP 测试填 `false`。
- `TRUST_PROXY`：仅在实际使用可信反向代理时填 `true`。

不要直接使用示例密码。以运行账号执行：

```bash
mkdir -p uploads
npm ci
npm run db:migrate
npm run db:seed
npm run build
exit
```

使用自定义 `UPLOAD_DIR` 时，创建对应目录并让运行账号可以读写。`npm ci` 需要安装开发依赖，数据库脚本和构建均依赖它们；不要在本步骤设置 `NODE_ENV=production` 或使用 `--omit=dev`。

## 2. 安装服务

```bash
cd /opt/ningxi-website
sudo bash scripts/linux-service.sh install ningxi /usr/bin/node
```

将 `/usr/bin/node` 替换为本机 `command -v node` 的实际结果。安装后，服务名为 `ningxi-website.service`，两个开关默认关闭，服务尚未启动。脚本使用绝对路径直接运行 Node 与 Next CLI，并由 Next 从项目目录读取 `.env`，不会把密码写入 systemd 服务文件。

```bash
sudo bash scripts/linux-service.sh start
sudo bash scripts/linux-service.sh status
```

官网地址为 `http://服务器地址:8444`，管理端为 `/admin`。如果使用域名与 HTTPS，在自己的反向代理中转发至 `127.0.0.1:8444`。

## 3. 两个独立开关

进入交互菜单：

```bash
sudo bash scripts/linux-service.sh
```

也可以直接执行命令：

| 操作 | 命令 |
| --- | --- |
| 开启开机自启 | `sudo bash scripts/linux-service.sh autostart on` |
| 关闭开机自启 | `sudo bash scripts/linux-service.sh autostart off` |
| 开启进程守护 | `sudo bash scripts/linux-service.sh guard on` |
| 关闭进程守护 | `sudo bash scripts/linux-service.sh guard off` |
| 启动 / 停止 / 重启 | `sudo bash scripts/linux-service.sh start` / `stop` / `restart` |
| 查看开关与运行状态 | `sudo bash scripts/linux-service.sh status` |
| 查看最近 100 行并跟随日志 | `sudo bash scripts/linux-service.sh logs` |
| 停止并卸载服务 | `sudo bash scripts/linux-service.sh uninstall` |

自启只控制下次系统启动时是否启动官网，切换时不改变当前运行状态。守护使用 systemd `Restart=always` / `Restart=no`，开启后，进程自行退出（包括正常退出、崩溃或被终止）等待 10 秒重新启动，持续重试；手动执行脚本 `stop` 或 `systemctl stop` 会正常停机。守护开关本身也不会主动启动或重启服务。

两个开关会持久保存，互不修改。重复 `install` 保留原安装路径、运行账号和开关状态。守护只处理进程退出，不执行 HTTP 健康探测。无需额外进程管理软件。

状态中 `enabled` / `disabled` 表示开机自启；`Restart=always` / `Restart=no` 表示守护；`ActiveState` 表示当前运行状态。请通过本脚本管理此服务的守护开关，避免再为同名服务添加覆盖 `Restart` 的 drop-in 配置。

## 4. 更新、停机与卸载

更新前备份数据库、`.env` 和上传目录，使用 `stop` 停止官网。以运行账号更新源码并执行 `npm ci`、`npm run db:migrate`、`npm run build`，再执行 `start`。两个开关会保持原状态。

更换部署目录、运行账号或 Node 路径时，先 `uninstall`，然后从新目录重新 `install`，按需重新开启两个开关。卸载只删除脚本安装的服务及守护配置，保留源码、数据库、`.env` 和上传文件。

服务配置：`/etc/systemd/system/ningxi-website.service`；守护配置：`/etc/systemd/system/ningxi-website.service.d/90-ningxi-guard.conf`。日志由系统 journal 管理。

启动失败时先查看 `logs`，确认数据库已运行、`.env` 正确、8444 未被占用、运行账号能访问项目及上传目录，再执行 `start`。如果登录异常，检查访问协议与 `COOKIE_SECURE` 是否匹配。

## 压缩包范围

包含项目源码、依赖锁文件、页面静态资源、原始 Logo、环境变量示例、本脚本、测试及部署说明。不包含本机 `.env`、管理员密码文件、数据库、上传内容、`node_modules`、`.next`、浏览器资料、检查截图或历史压缩包。当前包用于全新部署；迁移已有网站内容需要另行迁移 PostgreSQL 与上传目录，步骤见 `README.md` 的备份与恢复部分。

脚本已在当前 Windows 开发机使用 Git Bash 完成语法与模拟服务命令检查。当前环境没有可供本项目使用的 Linux systemd 实例，实际开机启动和异常进程重启需在部署服务器上验证。
