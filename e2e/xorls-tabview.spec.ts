import { expect, test } from '@playwright/test';
import { INITIAL_TABS, WorkspaceTabs } from './support/workspace-tabs';

/**
 * The xorls tab view is the tab strip above the workspaces: a header per tab that can be clicked or focused to
 * activate it, closed with its close button, and dragged to reorder. It shows the active tab's content, and a splash
 * screen when no tab is left. The app only uses it through the workspace tabs, so that is what it is tested in.
 */
test.describe('Xorls tab view', () => {
    let tabs: WorkspaceTabs;

    test.beforeEach(async ({ page }) => {
        tabs = new WorkspaceTabs(page);
        await tabs.open();
    });

    test.describe('headers', () => {
        test('shows a header for every tab, in order', async () => {
            expect(await tabs.names()).toEqual([...INITIAL_TABS]);
        });

        test('makes every header a focusable tab with a close button', async () => {
            for (const name of INITIAL_TABS) {
                const header = tabs.header(name);
                await expect(header).toHaveAttribute('role', 'tab');
                await expect(header).toHaveAttribute('tabindex', '0');
                await expect(tabs.closeButton(name)).toBeVisible();
            }
        });

        test('starts with the first tab active', async () => {
            await expect(tabs.activeHeader).toHaveCount(1);
            await expect(tabs.activeHeader).toHaveText(INITIAL_TABS[0]);
        });

        // this test is okay for now, but it doesnt really do what it says.
        // when the custom style modes are implemented more thoroughly, we will
        // have better ways to strictly test active vs inactive vs hover styles.
        test('styles the active header apart from the others', async ({ page }) => {
            await page.mouse.move(0, 0); // hover has its own style
            const styleOf = (name: string) => tabs.header(name).evaluate(el => {
                const s = getComputedStyle(el);
                return { borderTop: s.borderTopColor, background: s.backgroundColor, color: s.color };
            });

            const [active, inactive] = INITIAL_TABS;
            const activeStyle = await styleOf(active);
            const inactiveStyle = await styleOf(inactive);

            expect(activeStyle.borderTop).not.toBe(inactiveStyle.borderTop);
            expect(activeStyle.background).not.toBe(inactiveStyle.background);
            expect(activeStyle.color).not.toBe(inactiveStyle.color);
        });
    });

    test.describe('activating', () => {
        test('activates each tab when its header is clicked, and only that tab', async () => {
            // go through them backwards too, so every tab is activated from another one
            for (const name of [...INITIAL_TABS, ...[...INITIAL_TABS].reverse()]) {
                await tabs.header(name).click();

                await expect(tabs.activeHeader).toHaveCount(1);
                await expect(tabs.activeHeader).toHaveText(name);
            }
        });

        test('keeps a tab active when its header is clicked again', async () => {
            for (const name of INITIAL_TABS) {
                await tabs.activate(name);
                await tabs.header(name).click();

                await expect(tabs.activeHeader).toHaveText(name);
            }
        });

        for (const key of ['Enter', 'Space'] as const) {
            test(`activates each tab with ${key} on its focused header`, async ({ page }) => {
                for (const name of [...INITIAL_TABS].reverse()) {
                    await tabs.header(name).focus();
                    await page.keyboard.press(key);

                    await expect(tabs.activeHeader).toHaveText(name);
                }
            });
        }

        test('moves the focus between headers with Tab', async ({ page }) => {
            await tabs.header(INITIAL_TABS[0]).focus();
            // the close button sits between the headers in the tab order
            await page.keyboard.press('Tab');
            await expect(tabs.closeButton(INITIAL_TABS[0])).toBeFocused();
            await page.keyboard.press('Tab');
            await expect(tabs.header(INITIAL_TABS[1])).toBeFocused();
        });

        test('shows content for whichever tab is active', async () => {
            for (const name of INITIAL_TABS) {
                await tabs.activate(name);

                await expect(tabs.content).toBeVisible();
                await expect(tabs.workspace).toHaveCount(1);
            }
        });
    });

    test.describe('closing', () => {
        for (const name of INITIAL_TABS) {
            test(`removes "${name}" when its close button is clicked`, async () => {
                await tabs.close(name);

                expect(await tabs.names()).toEqual(INITIAL_TABS.filter(n => n !== name));
                await expect(tabs.header(name)).toHaveCount(0);
            });

            test(`activates the tab that is left when the active tab "${name}" is closed`, async () => {
                await tabs.activate(name);

                await tabs.close(name);

                const [left] = INITIAL_TABS.filter(n => n !== name);
                await expect(tabs.activeHeader).toHaveText(left);
                await expect(tabs.workspace).toBeVisible();
            });

            test(`keeps the active tab when the inactive tab other than "${name}" is closed`, async () => {
                await tabs.activate(name);
                const [other] = INITIAL_TABS.filter(n => n !== name);

                await tabs.close(other);

                await expect(tabs.activeHeader).toHaveText(name);
            });
        }

        test('shows the splash screen when every tab is closed', async () => {
            for (const name of INITIAL_TABS) await tabs.close(name);

            await expect(tabs.headerList).toHaveCount(0);
            await expect(tabs.content).toHaveCount(0);
            await expect(tabs.emptyState).toBeVisible();
            await expect(tabs.emptyState.getByRole('heading', { level: 1 })).toHaveText('Xor Logic Simulator');
            const logo = tabs.emptyState.locator('app-palette-component-svgs svg');
            await expect(logo).toBeVisible();
            await expect(logo.locator('desc')).toHaveText('XorGate');
        });

        test('closes the tabs in any order', async () => {
            for (const name of [...INITIAL_TABS].reverse()) await tabs.close(name);

            await expect(tabs.emptyState).toBeVisible();
        });
    });

    test.describe('reordering', () => {
        test('moves a tab when its header is dragged onto another', async () => {
            const [first, second] = INITIAL_TABS;

            await tabs.drag(first, second);
            expect(await tabs.names()).toEqual([second, first]);

            await tabs.drag(first, second);
            expect(await tabs.names()).toEqual([first, second]);
        });

        for (const name of INITIAL_TABS) {
            test(`keeps "${name}" active when it is dragged`, async () => {
                await tabs.activate(name);
                const [other] = INITIAL_TABS.filter(n => n !== name);

                await tabs.drag(name, other);

                await expect(tabs.activeHeader).toHaveText(name);
            });

            test(`keeps "${name}" active when another tab is dragged past it`, async () => {
                await tabs.activate(name);
                const [other] = INITIAL_TABS.filter(n => n !== name);

                await tabs.drag(other, name);

                expect(await tabs.names()).not.toEqual([...INITIAL_TABS]);
                await expect(tabs.activeHeader).toHaveText(name);
            });
        }

        test('leaves the order alone when a tab is dropped where it started', async ({ page }) => {
            const box = (await tabs.header(INITIAL_TABS[0]).boundingBox())!;
            const x = box.x + box.width / 2;
            const y = box.y + box.height / 2;

            await page.mouse.move(x, y);
            await page.mouse.down();
            await page.mouse.move(x + 5, y, { steps: 5 });
            await page.mouse.move(x, y, { steps: 5 });
            await page.mouse.up();
            await expect(page.locator('.cdk-drag-preview, .cdk-drag-placeholder')).toHaveCount(0);

            expect(await tabs.names()).toEqual([...INITIAL_TABS]);
            await expect(tabs.activeHeader).toHaveText(INITIAL_TABS[0]);
        });

        test('keeps the dragged header on the header row', async ({ page }) => {
            const [first, second] = INITIAL_TABS;
            const from = (await tabs.header(first).boundingBox())!;
            const to = (await tabs.header(second).boundingBox())!;

            await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
            await page.mouse.down();
            // pull down and right: the drag is locked to the x axis
            await page.mouse.move(to.x + to.width * 0.75, from.y + 200, { steps: 10 });

            const preview = page.locator('.cdk-drag-preview');
            await expect(preview).toBeVisible();
            const previewBox = (await preview.boundingBox())!;
            expect(Math.abs(previewBox.y - from.y)).toBeLessThan(2);

            await page.mouse.up();
        });

        test('cannot drag the last tab that is left', async () => {
            await tabs.close(INITIAL_TABS[1]);

            await expect(tabs.header(INITIAL_TABS[0])).toHaveClass(/\bcdk-drag-disabled\b/);
        });

        test('can drag tabs while there is more than one', async () => {
            for (const name of INITIAL_TABS) {
                await expect(tabs.header(name)).not.toHaveClass(/\bcdk-drag-disabled\b/);
            }
        });
    });
});
