'use strict';

// Real-browser smoke test. Requires Python 3 and an installed Playwright Chromium.
// Run from any directory: node tools/tests/signature_browser_smoke.cjs
// Optional: PLAYWRIGHT_MODULE=/path/to/node_modules/playwright
// Optional: CHROMIUM_EXECUTABLE=/path/to/chrome-headless-shell
// This script does not call an AI provider or change app source files.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');

const project = path.resolve(__dirname, '../..');
const assets = path.join(project, 'app/src/main/assets');
const output = path.join(project, 'output');
const modulePath = process.env.PLAYWRIGHT_MODULE || (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright')
  : 'playwright');
const {chromium} = require(modulePath);

function startServer() {
  const child = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', assets],
    {stdio: ['ignore', 'pipe', 'pipe']});
  return new Promise((resolve, reject) => {
    let log = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Local HTTP server did not start.')); }, 10000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Local HTTP server exited (${code}): ${log}`)); });
    child.stdout.on('data', chunk => {
      log += String(chunk);
      const match = log.match(/Serving HTTP on 127\.0\.0\.1 port (\d+)/);
      if (match) { clearTimeout(timeout); resolve({child, url: `http://127.0.0.1:${match[1]}/`}); }
    });
    child.stderr.on('data', chunk => { log += String(chunk); });
  });
}

async function noHorizontalOverflow(page, label) {
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  assert.ok(Math.max(widths.document, widths.body) <= widths.viewport + 1,
    `${label}: horizontal overflow ${JSON.stringify(widths)}`);
}

async function inspect(browser, url, viewport, mobile) {
  const context = await browser.newContext({viewport, deviceScaleFactor: 1, isMobile: mobile,
    hasTouch: mobile, reducedMotion: 'reduce'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) errors.push(message.text());
  });
  try {
    await page.goto(url, {waitUntil: 'networkidle'});
    await page.locator('[data-action="navigate"][data-route="signature"]').first().waitFor();
    assert.equal(await page.title(), 'The Spencerian Desk');
    await noHorizontalOverflow(page, `${mobile ? 'Mobile' : 'Desktop'} home`);

    await page.locator('[data-action="navigate"][data-route="signature"]').first().click();
    await page.locator('#sig-name').fill('Reuben Royal');
    await page.locator('[data-action="create-signatures"]').click();
    await page.waitForFunction(() => document.querySelectorAll('#signature-drafts .signature-draft').length === 3);
    assert.equal(await page.locator('#signature-drafts .signature-draft svg').count(), 3);
    await noHorizontalOverflow(page, `${mobile ? 'Mobile' : 'Desktop'} drafts`);

    if (mobile) {
      await page.screenshot({path: path.join(output, 'Signature-Lab-Mobile.png'), fullPage: true});
    } else {
      await page.locator('#signature-drafts').screenshot({path: path.join(output, 'Signature-Lab-Preview.png')});
    }

    await page.locator('[data-action="choose-signature"]').first().click();
    await page.locator('#sig-preview svg').waitFor();
    assert.equal(await page.locator('[data-action="signature-practice"]').isEnabled(), true);
    const selected = await page.evaluate(() => window.SpencerianApp.getState().signature);
    assert.equal(selected.name, 'Reuben Royal');
    assert.equal(selected.slant, 52);
    await page.locator('[data-action="sig-save"]').click();
    await page.waitForFunction(() => window.SpencerianApp.getState().signatures.length === 1);
    await page.locator('[data-action="signature-practice"]').click();
    await page.locator('#signature-practice-model svg').waitFor();
    assert.equal(await page.locator('.pl-template').inputValue(), 'free');
    assert.equal(await page.locator('.pl-slant').inputValue(), '52');
    await noHorizontalOverflow(page, `${mobile ? 'Mobile' : 'Desktop'} practice`);
    if (mobile) await page.screenshot({path: path.join(output, 'Signature-Lab-Practice.png'), fullPage: true});

    await page.reload({waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.SpencerianApp?.getState()?.signatures.length === 1);
    assert.equal(await page.evaluate(() => window.SpencerianApp.getState().signatures[0].name), 'Reuben Royal');
    assert.deepEqual(errors, [], 'Unexpected browser errors');
    console.log(`PASS ${mobile ? 'mobile' : 'desktop'} ${viewport.width}x${viewport.height}: home, three drafts, selection, save, practice, persistence, layout, console`);
  } finally {
    await context.close();
  }
}

(async () => {
  let browser, server;
  try {
    browser = await chromium.launch({headless: true,
      ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {})});
    server = await startServer();
    fs.mkdirSync(output, {recursive: true});
    await inspect(browser, server.url, {width: 412, height: 915}, true);
    await inspect(browser, server.url, {width: 1440, height: 1080}, false);
  } finally {
    if (server) server.child.kill();
    if (browser) await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
