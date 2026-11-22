import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSite } from '../src/lib/defaults';
import { withSiteDefaults } from '../src/lib/site-config';
import { validateSite } from '../src/lib/content';

test('旧站 JSON 补齐公安备案默认值，保留原备案及自定义内容且不修改原对象', () => {
  const legacy = structuredClone(defaultSite);
  for (const key of ['policeFilingEnabled', 'policeFilingText', 'policeFilingHref', 'policeFilingNewTab']) delete (legacy.footer as Record<string, unknown>)[key];
  legacy.footer.filingEnabled = true;
  legacy.footer.filingText = '原备案号';
  legacy.footer.filingHref = 'https://example.com/existing';
  const normalized = withSiteDefaults(legacy);
  assert.equal(normalized.footer.policeFilingEnabled, false);
  assert.equal(normalized.footer.policeFilingText, '');
  assert.equal(normalized.footer.policeFilingHref, '');
  assert.equal(normalized.footer.policeFilingNewTab, true);
  assert.equal(normalized.footer.filingText, '原备案号');
  assert.equal(normalized.footer.filingEnabled, true);
  assert.equal(normalized.sections, legacy.sections);
  assert.equal(Object.hasOwn(legacy.footer, 'policeFilingEnabled'), false);
  assert.doesNotThrow(() => validateSite(legacy));
});

test('开启公安备案时需要可见编号和有效链接，关闭时可留空，独立于原备案开关', () => {
  const site = structuredClone(defaultSite);
  site.footer.policeFilingEnabled = true;
  assert.throws(() => validateSite(site), /公安备案号/);
  site.footer.policeFilingText = '<p><br></p>';
  site.footer.policeFilingHref = 'https://example.com/record';
  assert.throws(() => validateSite(site), /公安备案号/);
  site.footer.policeFilingText = '<p><strong>公安备案测试编号</strong></p>';
  site.footer.policeFilingHref = 'invalid-address';
  assert.throws(() => validateSite(site), /有效的跳转链接/);
  site.footer.policeFilingHref = 'https://example.com/record';
  assert.doesNotThrow(() => validateSite(site));
  assert.deepEqual(withSiteDefaults(site), site);
  site.footer.policeFilingEnabled = false;
  site.footer.policeFilingHref = '';
  assert.doesNotThrow(() => validateSite(site));
});
