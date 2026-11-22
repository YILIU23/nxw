#!/usr/bin/env bash
# Linux + systemd only. Run with bash; no third-party process manager required.
set -euo pipefail

SERVICE=ningxi-website.service
UNIT_DIR=/etc/systemd/system
MARKER='# Managed by ningxi linux-service.sh v1'
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"

fail() { printf '错误：%s\n' "$*" >&2; exit 1; }
require_root() { [[ $EUID -eq 0 ]] || fail '请使用 sudo bash scripts/linux-service.sh 执行。'; }
check_system() {
  [[ $(uname -s) == Linux ]] || fail '本脚本仅支持 Linux。'
  command -v systemctl >/dev/null || fail '需要安装并使用 systemd 的 Linux 系统。'
  [[ -d /run/systemd/system ]] || fail 'systemd 必须作为本机服务管理器运行。'
}
unit_path() { printf '%s/%s' "$UNIT_DIR" "$SERVICE"; }
guard_path() { printf '%s/%s.d/90-ningxi-guard.conf' "$UNIT_DIR" "$SERVICE"; }
require_managed() {
  local file
  file=$(unit_path)
  [[ -f $file && ! -L $file ]] || fail '尚未安装服务，请先执行 install。'
  grep -Fxq -- "$MARKER" "$file" || fail "同名服务不属于本脚本：$file"
}
# Restrict deployment paths to ordinary Linux directory names, including spaces.
# This also prevents systemd specifiers, environment substitutions and line injection.
check_path() { [[ $1 =~ ^/[a-zA-Z0-9_./+\ -]+$ ]] || fail "路径请只使用英文字母、数字、空格及 /._+-：$1"; }

install_service() {
  require_root
  if [[ -e $(unit_path) || -L $(unit_path) ]]; then
    require_managed
    printf '服务已安装，保留原路径、运行账号和两个开关状态。\n'
    printf '更换部署目录、账号或 Node 路径时，请先 uninstall 再 install。\n'
    return
  fi
  local account=${1:-${SUDO_USER:-}} node_bin=${2:-} next_cli
  [[ -n $account ]] || fail '请指定运行账号，例如：install ningxi /usr/bin/node'
  [[ $account =~ ^[a-zA-Z_][a-zA-Z0-9_-]*[$]?$ ]] || fail '运行账号名称不受支持。'
  id "$account" >/dev/null 2>&1 || fail "账号不存在：$account"
  [[ $(id -u "$account") -ne 0 ]] || fail '请指定普通运行账号，例如 ningxi。'
  if [[ -z $node_bin ]]; then node_bin=$(command -v node || true); fi
  [[ -n $node_bin && -x $node_bin ]] || fail '找不到 Node，请传入 Node 可执行文件的绝对路径。'
  node_bin=$(readlink -f -- "$node_bin")
  next_cli="$PROJECT_DIR/node_modules/next/dist/bin/next"
  check_path "$PROJECT_DIR"
  check_path "$node_bin"
  [[ -f $PROJECT_DIR/.env ]] || fail '请先从 .env.example 创建并配置 .env。'
  [[ -f $PROJECT_DIR/.next/BUILD_ID && -f $next_cli ]] || fail '请先在 Linux 上执行 npm ci 和 npm run build。'
  command -v runuser >/dev/null || fail '需要 util-linux 提供的 runuser。'
  runuser -u "$account" -- test -r "$PROJECT_DIR/.env" || fail '运行账号无法读取 .env。'
  runuser -u "$account" -- test -r "$PROJECT_DIR/.next/BUILD_ID" || fail '运行账号无法访问构建文件。'
  runuser -u "$account" -- "$node_bin" -e 'if(Number(process.versions.node.split(".")[0]) < 24) process.exit(1)' || fail '运行账号需要可执行的 Node.js 24 或更新版本。'
  [[ ! -e $(guard_path) && ! -L $(guard_path) ]] || fail '发现已有守护配置，请先检查同名服务的 drop-in 文件。'
  install -d -m 755 -- "$UNIT_DIR"
  local temp_file
  temp_file=$(mktemp "$UNIT_DIR/.ningxi-unit.XXXXXX")
  cat > "$temp_file" <<EOF
$MARKER
[Unit]
Description=Ningxi Network Technology website (8444)
Wants=network-online.target
After=network-online.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=$account
WorkingDirectory="$PROJECT_DIR"
Environment=NODE_ENV=production
ExecStart="$node_bin" "$next_cli" start --hostname 0.0.0.0 --port 8444
Restart=no
RestartSec=10s
TimeoutStopSec=30s
KillSignal=SIGTERM
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ningxi-website

[Install]
WantedBy=multi-user.target
EOF
  chmod 644 "$temp_file"
  mv -- "$temp_file" "$(unit_path)"
  systemctl daemon-reload
  printf '服务已安装：%s\n开机自启：关闭；进程守护：关闭；服务尚未启动。\n' "$SERVICE"
}

autostart() {
  require_root; require_managed
  case ${1:-} in
    on) systemctl enable "$SERVICE" ;;
    off) systemctl disable "$SERVICE" ;;
    *) fail '用法：autostart on|off' ;;
  esac
  printf '开机自启已设为 %s，当前运行状态不变。\n' "$1"
}

guard() {
  require_root; require_managed
  local restart file temp_file
  case ${1:-} in on) restart=always ;; off) restart=no ;; *) fail '用法：guard on|off' ;; esac
  file=$(guard_path)
  if [[ -e $file || -L $file ]]; then
    [[ -f $file && ! -L $file ]] && grep -Fxq -- "$MARKER" "$file" || fail "守护配置不属于本脚本：$file"
  fi
  install -d -m 755 -- "$(dirname -- "$file")"
  temp_file=$(mktemp "$(dirname -- "$file")/.ningxi-guard.XXXXXX")
  printf '%s\n[Service]\nRestart=%s\nRestartSec=10s\n' "$MARKER" "$restart" > "$temp_file"
  chmod 644 "$temp_file"
  mv -- "$temp_file" "$file"
  systemctl daemon-reload
  printf '进程守护已设为 %s；不主动启动或重启服务。\n' "$1"
  systemctl show "$SERVICE" --property=Restart --property=RestartUSec
}

status() {
  require_managed
  printf '\n服务：%s（HTTP 8444）\n开机自启：' "$SERVICE"
  systemctl is-enabled "$SERVICE" || true
  systemctl show "$SERVICE" --property=ActiveState --property=SubState --property=MainPID --property=Restart --property=RestartUSec --property=User --property=WorkingDirectory
  printf 'Restart=always 表示守护开启，Restart=no 表示关闭。\n'
}

uninstall_service() {
  require_root; require_managed
  local file
  file=$(guard_path)
  if [[ -e $file || -L $file ]]; then
    [[ -f $file && ! -L $file ]] && grep -Fxq -- "$MARKER" "$file" || fail "守护配置不属于本脚本：$file"
  fi
  systemctl stop "$SERVICE"
  systemctl disable "$SERVICE"
  rm -f -- "$file" "$(unit_path)"
  rmdir -- "$UNIT_DIR/$SERVICE.d" 2>/dev/null || true
  systemctl daemon-reload
  systemctl reset-failed "$SERVICE" 2>/dev/null || true
  printf '服务已卸载。项目、数据库、环境配置及上传文件保留。\n'
}

usage() {
  cat <<'EOF'
柠汐官网 Linux 服务管理（systemd，HTTP 8444）
  sudo bash scripts/linux-service.sh                  交互菜单
  sudo bash scripts/linux-service.sh install [账号] [Node绝对路径]
  sudo bash scripts/linux-service.sh autostart on|off  开机自启开关
  sudo bash scripts/linux-service.sh guard on|off      进程守护开关
  sudo bash scripts/linux-service.sh start|stop|restart|status|logs
  sudo bash scripts/linux-service.sh uninstall         停止并卸载服务

首次安装默认两个开关关闭，使用 start 启动。
守护开启后，进程自行退出将等待 10 秒后重新启动；手动 stop 可正常停机。
EOF
}

dispatch() {
  local command=${1:-help}
  shift || true
  case $command in
    install) [[ $# -le 2 ]] || fail 'install 最多接受账号和 Node 路径。'; install_service "$@" ;;
    autostart) [[ $# -eq 1 ]] || fail '用法：autostart on|off'; autostart "$@" ;;
    guard) [[ $# -eq 1 ]] || fail '用法：guard on|off'; guard "$@" ;;
    start|stop|restart) require_root; require_managed; systemctl "$command" "$SERVICE" ;;
    status) status ;;
    logs) require_managed; journalctl --unit="$SERVICE" --lines=100 --follow ;;
    uninstall) uninstall_service ;;
    help|-h|--help) usage ;;
    *) fail "未知命令：$command（使用 help 查看用法）" ;;
  esac
}

menu() {
  local choice account node_bin
  while true; do
    printf '\n柠汐官网 · Linux 服务管理\n1 安装服务\n2 启动\n3 停止\n4 重启\n5 开机自启：开启\n6 开机自启：关闭\n7 进程守护：开启\n8 进程守护：关闭\n9 查看状态\n10 查看日志（Ctrl+C 退出）\n11 卸载服务\n0 退出\n'
    read -r -p '选择：' choice || return 0
    case $choice in
      1) read -r -p "运行账号（默认 ${SUDO_USER:-无}）：" account
         read -r -p 'Node 绝对路径（留空自动检测）：' node_bin
         bash "${BASH_SOURCE[0]}" install "${account:-${SUDO_USER:-}}" "$node_bin" || printf '安装未完成，请检查上面的错误。\n' ;;
      2) bash "${BASH_SOURCE[0]}" start || printf '启动未完成。\n' ;;
      3) bash "${BASH_SOURCE[0]}" stop || printf '停止未完成。\n' ;;
      4) bash "${BASH_SOURCE[0]}" restart || printf '重启未完成。\n' ;;
      5) bash "${BASH_SOURCE[0]}" autostart on || printf '设置未完成。\n' ;;
      6) bash "${BASH_SOURCE[0]}" autostart off || printf '设置未完成。\n' ;;
      7) bash "${BASH_SOURCE[0]}" guard on || printf '设置未完成。\n' ;;
      8) bash "${BASH_SOURCE[0]}" guard off || printf '设置未完成。\n' ;;
      9) bash "${BASH_SOURCE[0]}" status || printf '查询未完成。\n' ;;
      10) bash "${BASH_SOURCE[0]}" logs || true ;;
      11) read -r -p '停止并卸载服务？输入 YES 确认：' choice
          if [[ $choice == YES ]]; then bash "${BASH_SOURCE[0]}" uninstall || printf '卸载未完成。\n'; fi ;;
      0) return 0 ;;
      *) printf '请选择菜单中的编号。\n' ;;
    esac
  done
}

main() {
  if [[ ${1:-} =~ ^(help|-h|--help)$ ]]; then usage; return; fi
  check_system
  if [[ $# -eq 0 ]]; then require_root; menu; else dispatch "$@"; fi
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then main "$@"; fi
