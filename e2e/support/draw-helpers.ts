import { Page } from "@playwright/test";

/** Same shape as Point interface from src/app/models/Point.ts */
export interface Point {
    x: number;
    y: number;
}

export async function settle(page: Page) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

/** A width and a height, in pixels. */
export interface Size {
    width: number;
    height: number;
}

export type PinDirection = 'horizontal' | 'vertical';

/**
 * Makes the browser window bigger, and with it everything that fills it. Doesn't wait for the page to react: use
 * DiagramWorkspace.growWindow() to wait for the diagram, or wait for what the test is about.
 *
 * @returns The size the window had, to set it back with page.setViewportSize()
 */
export async function growWindow(page: Page, by: Size = { width: 500, height: 300 }): Promise<Size> {
    const before = page.viewportSize()!;
    await page.setViewportSize({ width: before.width + by.width, height: before.height + by.height });
    return before;
}
