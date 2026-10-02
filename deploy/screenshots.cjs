const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(process.argv[2] || 'http://127.0.0.1:3301', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '/tmp/elsewhere-hero.png' });
  for (const id of ['why', 'escapes', 'planner', 'early-access']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/tmp/elsewhere-${id}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(process.argv[2] || 'http://127.0.0.1:3301', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/elsewhere-mobile.png' });
  await page.locator('#planner').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/elsewhere-planner-mobile.png' });
  await browser.close();
  console.log('Desktop and mobile screenshots saved in /tmp/elsewhere-*.png');
})().catch(error => { console.error(error); process.exitCode = 1; });
