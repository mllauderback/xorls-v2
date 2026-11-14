import { Page } from "@playwright/test";

export async function settle(page: Page) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}