import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function run(page: Page, command: string): Promise<void> {
	await page.keyboard.press('/');
	const input = page.locator('[data-chat-input]');
	await input.pressSequentially(command);
	await input.press('Enter');
}

const slot = (page: Page, i: number) => page.locator(`[data-slot="${i}"]`);
const lastChat = (page: Page) => page.locator('[data-chat-log] li').last();

test.describe('物品欄進階', () => {
	test('滑鼠移到格子上顯示原版提示框', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await run(page, 'give @s ender_pearl 3');
		await slot(page, 0).hover();
		const tooltip = page.locator('[data-mc-tooltip]');
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toContainText('終界珍珠 × 3');
		await expect(tooltip).toContainText('傳送到隨機頁面');
	});

	test('丟出去的物品點一下撿回來', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await run(page, 'give @s map 2');
		await page.keyboard.press('q');
		await expect(slot(page, 0).locator('.count')).toHaveCount(0);
		const dropped = page.locator('[data-item-thrown]');
		await expect(dropped).toHaveCount(1);
		await dropped.click();
		await expect(dropped).toHaveCount(0);
		await expect(slot(page, 0).locator('.count')).toHaveText('2');
	});

	test('山羊角有冷卻時間，冷卻中不能再吹', async ({ page }) => {
		await page.goto('/');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await run(page, 'give @s goat_horn');
		await slot(page, 0).click();
		await expect(slot(page, 0).locator('.cooldown')).toHaveCount(1);
		await slot(page, 0).click();
		await expect(page.locator('[data-chat-log] li', { hasText: '吹響了山羊角' })).toHaveCount(1);
		// 山羊角不會用掉
		await expect(slot(page, 0).locator('img')).toHaveCount(1);
	});

	test('/kill：背包噴在死亡畫面上，重生前可以撿回來', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await run(page, 'give @s map 3');
		await run(page, 'give @s cake');
		await run(page, 'kill');
		await expect(page).toHaveURL(/\/kill\/$/);
		const drops = page.locator('[data-item-thrown]');
		await expect(drops).toHaveCount(2);
		await expect(page.locator('[data-hotbar]')).not.toHaveClass(/visible/);
		await drops.first().click();
		await expect(drops).toHaveCount(1);
		await expect(page.locator('[data-hotbar]')).toHaveClass(/visible/);
	});

	test('鑽石鎬：按住選單按鈕挖掉它，鎬子少一點耐久度', async ({ page }) => {
		await page.goto('/');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await run(page, 'give @s diamond_pickaxe');
		const banner = page.locator('a.banner[href="/about/"]');
		const box = await banner.boundingBox();
		if (!box) throw new Error('找不到按鈕');
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await expect(banner.locator('.crack')).toHaveCount(1);
		await expect(banner).toHaveCSS('visibility', 'hidden', { timeout: 3000 });
		await page.mouse.up();
		// 挖完沒有換頁
		await expect(page).toHaveURL(/\/$/);
		await expect(slot(page, 0).locator('.durability')).toHaveCount(1);
	});

	test('沒拿鑽石鎬時按鈕照常可以點', async ({ page }) => {
		await page.goto('/');
		await page.locator('a.banner[href="/about/"]').click();
		await expect(page).toHaveURL(/\/about\/$/);
	});

	test('命名牌：下一句話變成新名字，名牌用掉', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await run(page, 'give @s name_tag');
		await slot(page, 0).click();
		const input = page.locator('[data-chat-input]');
		await expect(input).toBeFocused();
		await input.fill('Steve');
		await input.press('Enter');
		await expect(lastChat(page)).toHaveText('你把名牌掛在自己身上，現在叫做 Steve');
		await expect(slot(page, 0).locator('img')).toHaveCount(0);

		await page.keyboard.press('t');
		await input.fill('嗨');
		await input.press('Enter');
		await expect(lastChat(page)).toHaveText('<Steve> 嗨');
	});

	test('地圖：列出頁面，標出目前位置，Esc 關閉', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/about/');
		await run(page, 'give @s map');
		await slot(page, 0).click();
		const map = page.locator('dialog.site-map');
		await expect(map).toBeVisible();
		await expect(map.locator('a')).toHaveCount(6);
		await expect(map.locator('a[href="/about/"]')).toHaveAttribute('data-state', 'here');
		await page.keyboard.press('Escape');
		await expect(map).toHaveCount(0);
		// 地圖不會用掉
		await expect(slot(page, 0).locator('img')).toHaveCount(1);
	});

	test('附魔書：選另一個物品幫它附魔', async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		await run(page, 'give @s enchanted_book');
		await run(page, 'give @s redstone 5');
		await slot(page, 0).click();
		await slot(page, 0).click();
		await expect(lastChat(page)).toContainText('選一個要附魔的物品');
		await slot(page, 1).click();
		await expect(slot(page, 1).locator('.glint')).toHaveCount(1);
		await expect(lastChat(page)).toContainText('紅石粉 附魔了');
		await expect(slot(page, 0).locator('img')).toHaveCount(0);
	});

	test('經驗瓶：丟出去碎掉，噴出經驗球', async ({ page }) => {
		await page.goto('/');
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.evaluate(() =>
			localStorage.setItem('inventory', JSON.stringify([{ item: 'experience_bottle', count: 2 }])),
		);
		await page.reload();
		await slot(page, 0).click();
		await expect(page.locator('.xp-orb').first()).toBeAttached({ timeout: 3000 });
		await expect(lastChat(page)).toHaveText(/獲得了 \d+ 點經驗/, { timeout: 8000 });
		await expect(slot(page, 0).locator('.count')).toHaveCount(0);
	});
});
