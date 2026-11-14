import { expect, test } from '@playwright/test';
import { INITIAL_TABS, WorkspaceTabs } from './support/workspace-tabs';

/**
 * The workspace tabs open a workspace for each tab and show the active tab's. Each tab keeps its own diagram while
 * another tab is shown, when the tabs are reordered and when the other tab is closed, and the active tab's diagram
 * is resized to fit the space it is shown in.
 *
 * What a workspace shows and how it draws belongs to the diagram workspace's own tests. These only change a diagram
 * (by placing a component) and compare pictures of it, to tell which tab's diagram is which.
 */
test.describe('Workspace tabs', () => {
    let tabs: WorkspaceTabs;

    test.beforeEach(async ({ page }) => {
        tabs = new WorkspaceTabs(page);
        await tabs.open();
    });

    /** A picture of each tab's diagram, taken before anything is placed. */
    const blankSnapshots = async (): Promise<Map<string, Buffer>> => {
        const snapshots = new Map<string, Buffer>();
        for (const name of INITIAL_TABS) {
            await tabs.activate(name);
            snapshots.set(name, await tabs.snapshot());
        }
        return snapshots;
    };

    /** Places a component in a tab and waits for its diagram to change. Returns the picture of the changed diagram. */
    const changeDiagram = async (name: string, blank: Buffer): Promise<Buffer> => {
        await tabs.activate(name);
        await tabs.place();
        await expect.poll(async () => (await tabs.snapshot()).equals(blank)).toBe(false);
        return tabs.snapshot();
    };

    /** Shows a tab and checks its diagram looks the way it did. */
    const expectDiagram = async (name: string, expected: Buffer) => {
        await tabs.activate(name);
        await expect.poll(async () => (await tabs.snapshot()).equals(expected)).toBe(true);
    };

    test.describe('workspaces', () => {
        test('opens with the initial tabs', async () => {
            expect(await tabs.names()).toEqual([...INITIAL_TABS]);
        });

        test('shows a diagram workspace in each tab', async () => {
            for (const name of INITIAL_TABS) {
                await tabs.activate(name);

                await expect(tabs.workspace).toHaveCount(1);
                await expect(tabs.workspace).toBeVisible();
            }
        });

        test('shows only the active tab\'s workspace', async ({ page }) => {
            for (const name of INITIAL_TABS) {
                await tabs.activate(name);

                await expect(page.locator('app-diagram-workspace-container')).toHaveCount(1);
            }
        });

        test('removes every workspace when every tab is closed', async ({ page }) => {
            for (const name of INITIAL_TABS) await tabs.close(name);

            await expect(page.locator('app-diagram-workspace-container')).toHaveCount(0);
            await expect(tabs.emptyState).toBeVisible();
        });
    });

    test.describe('diagram per tab', () => {
        for (const name of INITIAL_TABS) {
            test(`changes only the diagram of "${name}" while it is the active tab`, async () => {
                const blank = await blankSnapshots();

                await changeDiagram(name, blank.get(name)!);

                for (const other of INITIAL_TABS.filter(n => n !== name)) {
                    await expectDiagram(other, blank.get(other)!);
                }
            });

            test(`keeps the diagram of "${name}" while another tab is shown`, async () => {
                const blank = await blankSnapshots();
                const changed = await changeDiagram(name, blank.get(name)!);

                for (const other of INITIAL_TABS.filter(n => n !== name)) await tabs.activate(other);

                await expectDiagram(name, changed);
            });
        }

        test('keeps a diagram for each tab when every tab is changed', async () => {
            const blank = await blankSnapshots();
            const changed = new Map<string, Buffer>();
            for (const name of INITIAL_TABS) changed.set(name, await changeDiagram(name, blank.get(name)!));

            for (const name of [...INITIAL_TABS].reverse()) await expectDiagram(name, changed.get(name)!);
        });
    });

    test.describe('reordering', () => {
        for (const name of INITIAL_TABS) {
            test(`keeps the diagram of "${name}" with its tab when the tabs are reordered`, async () => {
                const blank = await blankSnapshots();
                const changed = await changeDiagram(name, blank.get(name)!);
                const [other] = INITIAL_TABS.filter(n => n !== name);

                await tabs.drag(name, other);

                await expectDiagram(name, changed);
                await expectDiagram(other, blank.get(other)!);
            });
        }
    });

    test.describe('closing', () => {
        for (const name of INITIAL_TABS) {
            test(`keeps the other diagram when "${name}" is closed`, async () => {
                const blank = await blankSnapshots();
                const [other] = INITIAL_TABS.filter(n => n !== name);
                const changed = await changeDiagram(other, blank.get(other)!);

                await tabs.activate(name);
                await tabs.close(name);

                await expect(tabs.activeHeader).toHaveText(other);
                await expect.poll(async () => (await tabs.snapshot()).equals(changed)).toBe(true);
            });

            test(`makes the tab that is left the active workspace when "${name}" is closed`, async () => {
                const blank = await blankSnapshots();
                const [other] = INITIAL_TABS.filter(n => n !== name);
                await tabs.activate(name);

                await tabs.close(name);

                // the workspace that is left takes the input: its diagram can be changed
                await changeDiagram(other, blank.get(other)!);
            });
        }
    });

    test.describe('diagram size', () => {
        test('makes the diagram of each tab at least as big as the space it is shown in', async () => {
            for (const name of INITIAL_TABS) {
                await tabs.activate(name);
                const viewport = await tabs.viewportSize();

                await expect.poll(async () => (await tabs.canvasSize()).width).toBeGreaterThanOrEqual(viewport.width);
                await expect.poll(async () => (await tabs.canvasSize()).height).toBeGreaterThanOrEqual(viewport.height);
            }
        });

        test('grows the diagram when the window grows', async ({ page }) => {
            const start = page.viewportSize()!;
            const before = await tabs.canvasSize();

            await page.setViewportSize({ width: start.width + 600, height: start.height + 400 });

            await expect.poll(async () => (await tabs.canvasSize()).width).toBeGreaterThan(before.width);
            await expect.poll(async () => (await tabs.canvasSize()).height).toBeGreaterThan(before.height);
            const viewport = await tabs.viewportSize();
            const after = await tabs.canvasSize();
            expect(after.width).toBeGreaterThanOrEqual(viewport.width);
            expect(after.height).toBeGreaterThanOrEqual(viewport.height);
        });

        test('does not shrink the diagram when the window shrinks', async ({ page }) => {
            const start = page.viewportSize()!;
            await page.setViewportSize({ width: start.width + 600, height: start.height + 400 });
            await expect.poll(async () => (await tabs.canvasSize()).width).toBeGreaterThan(start.width);
            const grown = await tabs.canvasSize();

            await page.setViewportSize(start);
            // give the resize observer a chance to fire
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

            expect(await tabs.canvasSize()).toEqual(grown);
        });

        test('sizes the diagram of a tab that is shown after the window grew', async ({ page }) => {
            const start = page.viewportSize()!;
            await page.setViewportSize({ width: start.width + 600, height: start.height + 400 });

            for (const name of [...INITIAL_TABS].reverse()) {
                await tabs.activate(name);
                const viewport = await tabs.viewportSize();

                await expect.poll(async () => (await tabs.canvasSize()).width).toBeGreaterThanOrEqual(viewport.width);
                await expect.poll(async () => (await tabs.canvasSize()).height).toBeGreaterThanOrEqual(viewport.height);
            }
        });
    });
});
