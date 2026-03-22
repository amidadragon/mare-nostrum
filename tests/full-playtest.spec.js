const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8090';

// Helper: start a fresh game, skip to island with a specific faction
async function startFreshGame(page, faction = 'rome') {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => { errors.push(err.message); });

  await page.goto(BASE_URL);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1500);

  // Clear save, reload
  await page.evaluate(() => {
    localStorage.removeItem('sunlitIsles_save');
    localStorage.removeItem('sunlitIsles_backup');
  });
  await page.reload();
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click NEW VOYAGE
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.68);
  await page.waitForTimeout(500);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.68);
  await page.waitForTimeout(3000);

  // Force faction + skip intro to island
  await page.evaluate((f) => {
    if (typeof state !== 'undefined') {
      state.faction = f;
      if (typeof selectFaction === 'function') selectFaction(f);
      gameScreen = 'game';
      state.introPhase = 'done';
      state.homeIslandReached = true;
      state.islandLevel = 1;
      if (typeof initState === 'function' && !state.player) initState();
    }
  }, faction);
  await page.waitForTimeout(2000);

  return { canvas, errors, box };
}

// Helper: get game state
async function getState(page, path) {
  return page.evaluate((p) => {
    try { return eval('state.' + p); } catch(e) { return null; }
  }, path);
}

// Helper: press key and wait
async function pressKey(page, key, wait = 500) {
  await page.keyboard.press(key);
  await page.waitForTimeout(wait);
}

// Helper: check no crash errors
function filterErrors(errors) {
  return errors.filter(e => {
    if (e.includes('service-worker')) return false;
    if (e.includes('favicon')) return false;
    if (e.includes('manifest')) return false;
    if (e.includes('Failed to load resource')) return false;
    if (e.includes('net::ERR')) return false;
    return true;
  });
}

test.describe('Game Loading', () => {
  test('canvas renders and menu loads', async ({ page }) => {
    await page.goto(BASE_URL);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveTitle(/MARE NOSTRUM/i);
  });

  test('new game starts without crashes', async ({ page }) => {
    const { errors } = await startFreshGame(page);
    await page.waitForTimeout(3000);
    const screen = await page.evaluate(() => typeof gameScreen !== 'undefined' ? gameScreen : null);
    expect(screen).toBe('game');
    expect(filterErrors(errors)).toEqual([]);
  });
});

test.describe('Core Systems', () => {
  test('player exists and can move', async ({ page }) => {
    await startFreshGame(page);
    const px1 = await getState(page, 'player.x');
    await page.keyboard.down('d');
    await page.waitForTimeout(1000);
    await page.keyboard.up('d');
    const px2 = await getState(page, 'player.x');
    expect(px2).toBeGreaterThan(px1);
  });

  test('sprint works (SHIFT increases speed)', async ({ page }) => {
    await startFreshGame(page);
    // Move right without sprint
    const px1 = await getState(page, 'player.x');
    await page.keyboard.down('d');
    await page.waitForTimeout(500);
    await page.keyboard.up('d');
    const px2 = await getState(page, 'player.x');
    const normalDist = px2 - px1;

    // Reset position
    await page.evaluate(() => { state.player.x = 600; });
    await page.waitForTimeout(100);

    // Move right with sprint
    const px3 = await getState(page, 'player.x');
    await page.keyboard.down('Shift');
    await page.keyboard.down('d');
    await page.waitForTimeout(500);
    await page.keyboard.up('d');
    await page.keyboard.up('Shift');
    const px4 = await getState(page, 'player.x');
    const sprintDist = px4 - px3;

    expect(sprintDist).toBeGreaterThan(normalDist * 1.3);
  });

  test('zoom works (scroll wheel)', async ({ page }) => {
    const { canvas, box } = await startFreshGame(page);
    const zoom1 = await page.evaluate(() => typeof camZoom !== 'undefined' ? camZoom : 1);
    // Scroll up to zoom in
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(1000);
    const zoom2 = await page.evaluate(() => typeof camZoomTarget !== 'undefined' ? camZoomTarget : 1);
    expect(zoom2).toBeGreaterThan(1);
  });
});

test.describe('Faction Systems', () => {
  const factions = ['rome', 'carthage', 'egypt', 'greece', 'seapeople', 'persia', 'phoenicia', 'gaul'];

  for (const faction of factions) {
    test(`${faction} faction loads without crashes`, async ({ page }) => {
      const { errors } = await startFreshGame(page, faction);
      await page.waitForTimeout(3000);

      // Verify faction set
      const f = await getState(page, 'faction');
      expect(f).toBe(faction);

      // Verify faction terms work
      const terms = await page.evaluate(() => typeof getFactionTerms === 'function' ? getFactionTerms() : null);
      expect(terms).not.toBeNull();
      expect(terms.soldier).toBeTruthy();

      // Verify no crashes
      expect(filterErrors(errors)).toEqual([]);
    });
  }
});

test.describe('UI Systems', () => {
  test('equipment window opens with O key', async ({ page }) => {
    await startFreshGame(page);
    await pressKey(page, 'o');
    const open = await page.evaluate(() => typeof state !== 'undefined' && state.equipmentWindowOpen);
    expect(open).toBe(true);
    await pressKey(page, 'Escape');
  });

  test('build mode toggles with B key', async ({ page }) => {
    await startFreshGame(page);
    await pressKey(page, 'b');
    const buildMode = await page.evaluate(() => typeof state !== 'undefined' && state.buildMode);
    expect(buildMode).toBe(true);
    await pressKey(page, 'b');
    const buildMode2 = await page.evaluate(() => typeof state !== 'undefined' && state.buildMode);
    expect(buildMode2).toBe(false);
  });

  test('world map opens with M key', async ({ page }) => {
    await startFreshGame(page);
    await pressKey(page, 'm');
    const mapOpen = await page.evaluate(() => typeof state !== 'undefined' && state.mapOpen);
    expect(mapOpen).toBe(true);
  });

  test('legia panel opens with L key', async ({ page }) => {
    await startFreshGame(page);
    // Need castrum first
    await page.evaluate(() => {
      state.legia.castrumLevel = 1;
      state.legia.castrumX = 920;
      state.legia.castrumY = 480;
    });
    await pressKey(page, 'l');
    const open = await page.evaluate(() => state.legia && state.legia.legiaUIOpen);
    expect(open).toBe(true);
  });
});

test.describe('Game State', () => {
  test('initState creates valid state', async ({ page }) => {
    await startFreshGame(page);
    // Check critical state fields exist
    const checks = await page.evaluate(() => ({
      hasPlayer: !!state.player,
      hasLegia: !!state.legia,
      hasEquipment: !!state.equipment,
      hasBuildings: Array.isArray(state.buildings),
      hasNations: typeof state.nations === 'object',
      foodShortage: typeof state.foodShortage === 'number',
      seaPeopleCD: typeof state.seaPeopleRaidCooldown === 'number',
      templeCourt: !!state.templeCourt,
    }));
    expect(checks.hasPlayer).toBe(true);
    expect(checks.hasLegia).toBe(true);
    expect(checks.hasEquipment).toBe(true);
    expect(checks.hasBuildings).toBe(true);
    expect(checks.foodShortage).toBe(true);
    expect(checks.seaPeopleCD).toBe(true);
    expect(checks.templeCourt).toBe(true);
  });

  test('save and load preserves state', async ({ page }) => {
    await startFreshGame(page);

    // Modify state
    await page.evaluate(() => {
      state.gold = 999;
      state.islandLevel = 5;
      state.foodShortage = 2;
      state.seaPeopleRaidCooldown = 3;
      if (typeof saveGame === 'function') saveGame();
    });
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.locator('canvas').waitFor({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Click CONTINUE VOYAGE
    const box = await page.locator('canvas').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.68);
    await page.waitForTimeout(3000);

    // Verify state preserved
    const gold = await getState(page, 'gold');
    expect(gold).toBe(999);
    const level = await getState(page, 'islandLevel');
    expect(level).toBe(5);
  });
});

test.describe('Combat Systems', () => {
  test('counter multiplier function exists and works', async ({ page }) => {
    await startFreshGame(page);
    const result = await page.evaluate(() => {
      if (typeof getCounterMultiplier !== 'function') return null;
      return {
        cavVsArcher: getCounterMultiplier('cavalry', 'archer'),
        archerVsLeg: getCounterMultiplier('archer', 'legionary'),
        legVsCav: getCounterMultiplier('legionary', 'cavalry'),
        neutral: getCounterMultiplier('legionary', 'legionary'),
      };
    });
    expect(result).not.toBeNull();
    expect(result.cavVsArcher).toBe(1.5);
    expect(result.archerVsLeg).toBe(1.5);
    expect(result.legVsCav).toBe(1.5);
    expect(result.neutral).toBe(1.0);
  });

  test('FORMATIONS constant exists with 5 formations', async ({ page }) => {
    await startFreshGame(page);
    const count = await page.evaluate(() => typeof FORMATIONS !== 'undefined' ? Object.keys(FORMATIONS).length : 0);
    expect(count).toBe(5);
  });
});

test.describe('Draw Loop Stability', () => {
  test('runs 300 frames without crashing', async ({ page }) => {
    const { errors } = await startFreshGame(page);
    // Let it run for 5 seconds (~300 frames at 60fps)
    await page.waitForTimeout(5000);
    const frameCount = await page.evaluate(() => typeof frameCount !== 'undefined' ? frameCount : 0);
    expect(frameCount).toBeGreaterThan(100);
    expect(filterErrors(errors)).toEqual([]);
  });

  test('runs 10 seconds at different island levels without errors', async ({ page }) => {
    const { errors } = await startFreshGame(page);
    for (const level of [1, 3, 5, 8, 10]) {
      await page.evaluate((lv) => {
        state.islandLevel = lv;
        state.islandRX = 500 + lv * 30;
        state.islandRY = 320 + lv * 20;
      }, level);
      await page.waitForTimeout(2000);
    }
    expect(filterErrors(errors)).toEqual([]);
  });
});
