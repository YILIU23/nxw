import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const bash = process.env.BASH_PATH || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const hasBash = spawnSync(bash, ['--version'], { encoding: 'utf8' }).status === 0;
const posixPath = (value: string) => value.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`);
const marker = '# Managed by ningxi linux-service.sh v1';

// Mock only OS administration. The actual script writes units/drop-ins into a disposable directory.
const harness = `
source scripts/linux-service.sh
UNIT_DIR="$NX_TEST_ROOT/units"
PROJECT_DIR="$NX_TEST_ROOT/project with spaces"
require_root() { :; }
id() { if [[ $1 == -u ]]; then echo 1001; else echo 'uid=1001(ningxi)'; fi; }
runuser() { return 0; }
systemctl() {
  printf '%s\\n' "$*" >> "$NX_TEST_ROOT/commands"
  if [[ $NX_TEST_FAIL == "$1" ]]; then return 1; fi
  case $1 in
    enable) echo enabled > "$NX_TEST_ROOT/enabled" ;;
    disable) echo disabled > "$NX_TEST_ROOT/enabled" ;;
    is-enabled) if [[ -f $NX_TEST_ROOT/enabled ]]; then cat "$NX_TEST_ROOT/enabled"; else echo disabled; return 1; fi ;;
    show) if [[ -f $(guard_path) ]]; then grep '^Restart=' "$(guard_path)"; else echo Restart=no; fi ;;
  esac
}
dispatch "$@"
`;

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'ningxi-service-'));
  const units = path.join(root, 'units');
  const project = path.join(root, 'project with spaces');
  mkdirSync(units);
  mkdirSync(path.join(project, '.next'), { recursive: true });
  mkdirSync(path.join(project, 'node_modules/next/dist/bin'), { recursive: true });
  writeFileSync(path.join(project, '.env'), 'EXAMPLE=placeholder\n');
  writeFileSync(path.join(project, '.next/BUILD_ID'), 'test-build');
  writeFileSync(path.join(project, 'node_modules/next/dist/bin/next'), '');
  const unit = path.join(units, 'ningxi-website.service');
  const dropin = path.join(units, 'ningxi-website.service.d/90-ningxi-guard.conf');
  const run = (args: string[], failure = '') => spawnSync(bash, ['--noprofile', '--norc', '-c', harness, 'test', ...args], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, NX_TEST_ROOT: posixPath(root), NX_TEST_FAIL: failure },
  });
  const ok = (args: string[]) => {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    return result.stdout;
  };
  const commands = () => readFileSync(path.join(root, 'commands'), 'utf8');
  const install = () => ok(['install', 'ningxi', '/usr/bin/bash']);
  return { root, project, unit, dropin, run, ok, commands, install, clean: () => rmSync(root, { recursive: true, force: true }) };
}

test('Linux service: installs quoted paths, port 8444, default switches off and no automatic start', { skip: !hasBash }, () => {
  const f = fixture();
  try {
    f.install();
    const unit = readFileSync(f.unit, 'utf8');
    assert.match(unit, /User=ningxi/);
    assert.match(unit, /WorkingDirectory=".*project with spaces"/);
    assert.match(unit, /--port 8444/);
    assert.match(unit, /Restart=no/);
    assert.match(unit, /StartLimitIntervalSec=0/);
    assert.equal(f.commands(), 'daemon-reload\n');
    assert.equal(existsSync(f.dropin), false);
    assert.doesNotMatch(unit, /EXAMPLE=placeholder/);
  } finally { f.clean(); }
});

test('Linux service: all four independent switch combinations and repeated installation preserve state', { skip: !hasBash }, () => {
  const f = fixture();
  try {
    f.install();
    for (const autostart of ['on', 'off']) {
      for (const guard of ['on', 'off']) {
        f.ok(['autostart', autostart]);
        f.ok(['guard', guard]);
        const expectedRestart = guard === 'on' ? 'always' : 'no';
        const expectedAutostart = autostart === 'on' ? 'enabled' : 'disabled';
        const before = f.commands();
        f.install();
        assert.equal(f.commands(), before, 'reinstall must not change service state');
        const status = f.ok(['status']);
        assert.match(status, new RegExp(`Restart=${expectedRestart}`));
        assert.match(status, new RegExp(expectedAutostart));
        assert.match(readFileSync(f.dropin, 'utf8'), /RestartSec=10s/);
      }
    }
    assert.doesNotMatch(f.commands(), /^(start|stop|restart) /m);
    f.ok(['stop']);
    assert.match(f.commands(), /stop ningxi-website.service\n$/);
  } finally { f.clean(); }
});

test('Linux service: invalid switches and foreign configuration are rejected', { skip: !hasBash }, () => {
  const f = fixture();
  try {
    writeFileSync(f.unit, '# foreign unit\n');
    assert.notEqual(f.run(['install', 'ningxi', '/usr/bin/bash']).status, 0);
    assert.equal(readFileSync(f.unit, 'utf8'), '# foreign unit\n');
    writeFileSync(f.unit, `${marker}\n`);
    assert.notEqual(f.run(['guard', 'invalid']).status, 0);
    assert.notEqual(f.run(['autostart', 'invalid']).status, 0);
    mkdirSync(path.dirname(f.dropin));
    writeFileSync(f.dropin, '# foreign drop-in\n');
    assert.notEqual(f.run(['guard', 'on']).status, 0);
    assert.notEqual(f.run(['uninstall']).status, 0);
    assert.equal(readFileSync(f.dropin, 'utf8'), '# foreign drop-in\n');
    assert.equal(existsSync(path.join(f.root, 'commands')), false);
  } finally { f.clean(); }
});

test('Linux service: failed systemctl operations report failure without a success message', { skip: !hasBash }, () => {
  const f = fixture();
  try {
    f.install();
    for (const [args, failure] of [[['autostart', 'on'], 'enable'], [['guard', 'on'], 'daemon-reload']] as const) {
      const result = f.run([...args], failure);
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.stdout, /已设为/);
    }
  } finally { f.clean(); }
});

test('Linux service: uninstall stops and disables service, preserves application and unrelated drop-ins', { skip: !hasBash }, () => {
  const f = fixture();
  try {
    f.install();
    f.ok(['guard', 'on']);
    const foreign = path.join(path.dirname(f.dropin), 'other.conf');
    writeFileSync(foreign, '# another config\n');
    f.ok(['uninstall']);
    assert.equal(existsSync(f.unit), false);
    assert.equal(existsSync(f.dropin), false);
    assert.equal(existsSync(foreign), true);
    assert.equal(existsSync(path.join(f.project, '.env')), true);
    assert.match(f.commands(), /stop ningxi-website.service\ndisable ningxi-website.service\ndaemon-reload/);
  } finally { f.clean(); }
});
