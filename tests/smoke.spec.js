const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8090';

test.describe('Mare Nostrum smoke tests', () => {
  test('menu screen loads and new game starts without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    // 1. Open the game
    await page.goto(BASE_URL);

    // 2. Wait for canvas to appear (p5.js creates a <canvas> element)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 3. Verify the page title contains MARE NOSTRUM
    await expect(page).toHaveTitle(/MARE NOSTRUM/i);

    // 4. Wait for menu to fully render (menuFadeIn animation takes ~1s)
    await page.waitForTimeout(2000);

    // 5. Clear any existing save so "NEW VOYAGE" is the first menu item
    await page.evaluate(() => localStorage.removeItem('sunlitIsles_save'));

    // Reload so menu rebuilds without "CONTINUE VOYAGE"
    await page.reload();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    // 6. Click "NEW VOYAGE" — rendered on p5 canvas at center-x, ~68% height.
    //    Move mouse first so menuHover is set by the draw loop, then click.
    const box = await canvas.boundingBox();
    const clickX = box.x + box.width / 2;
    const clickY = box.y + box.height * 0.68;
    await page.mouse.move(clickX, clickY);
    await page.waitForTimeout(500); // let draw loop set menuHover
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();

    // 7. Wait for fade-out + game load (intro cinematic starts)
    await page.waitForTimeout(4000);

    // 8. Verify game entered play mode by checking gameScreen === 'game'
    const screen = await page.evaluate(() => {
      return typeof gameScreen !== 'undefined' ? gameScreen : null;
    });
    expect(screen).toBe('game');

    // 9. Verify wreck beach loaded (introPhase should be active or done)
    const introState = await page.evaluate(() => {
      return state && state.introPhase ? state.introPhase : null;
    });
    expect(introState).not.toBeNull();

    // 10. Wait 5 seconds for stability
    await page.waitForTimeout(5000);

    // 11. Check for console errors — should be zero
    const realErrors = consoleErrors.filter(e => {
      // Ignore known non-fatal warnings
      if (e.includes('service-worker')) return false;
      if (e.includes('favicon')) return false;
      if (e.includes('manifest')) return false;
      if (e.includes('Failed to load resource')) return false;
      return true;
    });
    expect(realErrors).toEqual([]);
  });
});
