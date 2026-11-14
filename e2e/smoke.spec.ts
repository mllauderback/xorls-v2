import { expect, test } from '@playwright/test';
import { CATEGORIES, ComponentPalette } from './support/component-palette';
import { DiagramWorkspace } from './support/diagram-workspace';
import { SettingsPanel } from './support/settings-panel';
import { INITIAL_TABS, WorkspaceTabs } from './support/workspace-tabs';

/**
 * The few things every other e2e test builds on. These run first, as the "smoke" project in playwright.config.ts,
 * and the other projects depend on it: if one of these fails, the rest of the suite is not run, so the report shows
 * the cause instead of a failure for every test that needed it.
 *
 * Keep these few, quick and coarse. What each part does in detail belongs in its own spec.
 */
test.describe('Smoke', () => {
    test('loads the app', async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveTitle('Xorls');
    });

    test('opens with the workspace tabs and a diagram workspace', async ({ page }) => {
        const tabs = new WorkspaceTabs(page);
        await tabs.open();

        expect(await tabs.names()).toEqual([...INITIAL_TABS]);
        await expect(tabs.workspace).toBeVisible();
    });

    test('opens the component palette with its categories', async ({ page }) => {
        const palette = new ComponentPalette(page);
        await palette.open();

        await expect(palette.headers).toHaveText([...CATEGORIES]);
    });

    test('picks a component in the palette', async ({ page }) => {
        const palette = new ComponentPalette(page);
        await palette.open();
        await palette.expand('Gates');

        await palette.clickTile('AndGate');

        await expect(palette.checkbox('AndGate')).toBeChecked();
    });

    test('places a picked component in the diagram', async ({ page }) => {
        const diagram = new DiagramWorkspace(page);
        await diagram.open();
        await expect.poll(() => diagram.drawn('grid')).not.toBeNull();

        await diagram.place();

        await expect.poll(() => diagram.drawn('component')).not.toBeNull();
    });

    test('opens the grid settings', async ({ page }) => {
        const settings = new SettingsPanel(page);
        await page.goto('/');

        await settings.openGridSettings();

        await expect(page.locator('#gridSpacing')).toBeVisible();
    });
});
