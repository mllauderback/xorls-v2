import { expect } from '@playwright/test';
import { test, watchAnimations } from './support/test';
import { CATEGORIES, COMPONENTS, ComponentPalette } from './support/component-palette';
import { DiagramWorkspace } from './support/diagram-workspace';

/**
 * The component palette is the "Components" tab of the sidebar: an accordion with one grid selection panel per
 * category on top, and the properties of the selected component below. Its selection lives in the store, so it
 * survives the palette being hidden and is cleared by the workspace.
 */
test.describe('Component palette', () => {
    let palette: ComponentPalette;

    test.beforeEach(async ({ page }) => {
        palette = new ComponentPalette(page);
        await palette.load();
    });

    test.describe('sidebar', () => {
        test('is hidden until the components tab is opened', async ({ page }) => {
            await page.goto('/');
            await expect(palette.tabPanel).toBeHidden();

            await palette.componentsTab.click();

            await expect(palette.componentsTab).toHaveAttribute('aria-selected', 'true');
            await expect(palette.tabPanel).toBeVisible();
            await expect(palette.root).toBeVisible();
        });

        test('loads the palette from the store, without the loading message', async () => {
            await expect(palette.tabPanel.getByText('Loading component palette...')).toHaveCount(0);
        });

        test('hides again when another sidebar tab is opened', async () => {
            await palette.sidebar.open('settings');

            await expect(palette.tabPanel).toBeHidden();
        });
    });

    test.describe('categories', () => {
        test('has a header for every category, in order', async () => {
            await expect(palette.headers).toHaveText([...CATEGORIES]);
        });

        test('starts with every category collapsed', async () => {
            for (const category of CATEGORIES) {
                await expect(palette.header(category)).toHaveAttribute('aria-expanded', 'false');
                await expect(palette.grid(category)).toBeHidden();
            }
        });

        test('expands each category when its header is clicked, leaving the unclicked ones collapsed', async () => {
            for (const [index, category] of CATEGORIES.entries()) {
                await palette.header(category).click();

                await expect(palette.header(category)).toHaveAttribute('aria-expanded', 'true');
                await expect(palette.grid(category)).toBeVisible();
                await expect(palette.grid(category).locator('.grid-selection-label')).toHaveCount(COMPONENTS[category].length);

                for (const later of CATEGORIES.slice(index + 1)) {
                    await expect(palette.header(later)).toHaveAttribute('aria-expanded', 'false');
                    await expect(palette.grid(later)).toBeHidden();
                }
            }
        });

        test('collapses each expanded category when its header is clicked again', async () => {
            for (const category of CATEGORIES) {
                await palette.expand(category);

                await palette.header(category).click();

                await expect(palette.header(category)).toHaveAttribute('aria-expanded', 'false');
                await expect(palette.grid(category)).toBeHidden();
            }
        });

        test('keeps several categories open at once', async () => {
            for (const category of CATEGORIES) await palette.expand(category);

            for (const category of CATEGORIES) {
                await expect(palette.header(category)).toHaveAttribute('aria-expanded', 'true');
                await expect(palette.grid(category)).toBeVisible();
            }
        });

        test('collapsing any one category leaves the others open', async () => {
            for (const category of CATEGORIES) await palette.expand(category);

            for (const category of CATEGORIES) {
                await palette.collapse(category);

                for (const other of CATEGORIES.filter(c => c !== category)) {
                    await expect(palette.header(other)).toHaveAttribute('aria-expanded', 'true');
                    await expect(palette.grid(other)).toBeVisible();
                }

                await palette.expand(category);
            }
        });

        test('toggles each category from the keyboard', async ({ page }) => {
            for (const category of CATEGORIES) {
                await palette.header(category).focus();

                await page.keyboard.press('Enter');
                await expect(palette.header(category)).toHaveAttribute('aria-expanded', 'true');
                await expect(palette.grid(category)).toBeVisible();

                await page.keyboard.press('Enter');
                await expect(palette.header(category)).toHaveAttribute('aria-expanded', 'false');
                await expect(palette.grid(category)).toBeHidden();
            }
        });
    });

    test.describe('category animations', () => {
        test.use({ animations: true });

        test('animates each category open and closed', async () => {
            for (const category of CATEGORIES) {
                let animations = await watchAnimations(palette.panel(category));
                await palette.expand(category);
                await expect.poll(async () => (await animations()).map(a => a.kind)).toContain('angular');

                animations = await watchAnimations(palette.panel(category));
                await palette.collapse(category);
                await expect.poll(async () => (await animations()).map(a => a.kind)).toContain('angular');
            }
        });

        test('shows a category at its full height once it has opened', async () => {
            for (const category of CATEGORIES) {
                await palette.expand(category);
                await expect(palette.panel(category).locator('.ng-animating')).toHaveCount(0);
                const tile = palette.grid(category).locator('.grid-selection-label').last();

                // the content is clipped while it grows: its last tile is fully inside the panel when it is done
                const panel = (await palette.panel(category).boundingBox())!;
                const box = (await tile.boundingBox())!;
                expect(box.y + box.height).toBeLessThanOrEqual(panel.y + panel.height);
            }
        });

        test('selects a tile that is clicked while its category is still opening', async () => {
            await palette.header('Gates').click();
            // no waiting for the animation: the click goes in as soon as the tile can take it
            await palette.clickTile('AndGate');

            await expect(palette.checkbox('AndGate')).toBeChecked();
        });
    });

    test.describe('properties panel', () => {
        test('is shown below the palette', async () => {
            await expect(palette.propertiesPanel).toBeVisible();

            const paletteBox = await palette.root.locator('p-accordion').boundingBox();
            const propertiesBox = await palette.propertiesPanel.boundingBox();
            expect(propertiesBox!.y).toBeGreaterThan(paletteBox!.y);
        });

        test('says nothing is selected when no placed component is selected', async () => {
            await expect(palette.propertiesPanel).toContainText('Nothing is selected.');
        });

        // this will change eventually.  I do want the properties panel to update for a component ghost
        test('still says nothing is selected while a palette component is waiting to be placed', async () => {
            // picking from the palette is not selecting a placed component
            await palette.expand('Gates');
            await palette.clickTile('AndGate');

            await expect(palette.propertiesPanel).toContainText('Nothing is selected.');
        });
    });

    test.describe('selection', () => {
        test('is kept when its category is collapsed and expanded again', async () => {
            for (const category of CATEGORIES) {
                const type = COMPONENTS[category].at(-1)!;
                await palette.expand(category);
                await palette.clickTile(type);

                await palette.collapse(category);
                await palette.expand(category);

                await expect(palette.checkbox(type)).toBeChecked();
                await expect.poll(() => palette.checkedTypes()).toEqual([type]);
            }
        });

        test('is kept when the sidebar switches to another tab and back', async () => {
            await palette.expand('I/O');
            await palette.clickTile('SevenSegmentDisplay');

            await palette.sidebar.open('explorer');
            await expect(palette.tabPanel).toBeHidden();
            await palette.sidebar.open('components');

            await expect(palette.checkbox('SevenSegmentDisplay')).toBeChecked();
            await expect.poll(() => palette.checkedTypes()).toEqual(['SevenSegmentDisplay']);
        });

        test('is exclusive across every category', async () => {
            for (const category of CATEGORIES) await palette.expand(category);

            for (const category of CATEGORIES) {
                for (const type of COMPONENTS[category]) {
                    await palette.clickTile(type);
                    await expect.poll(() => palette.checkedTypes()).toEqual([type]);
                }
            }
        });

        test('starts over unselected after the page is reloaded', async ({ page }) => {
            await palette.expand('Gates');
            await palette.clickTile('OrGate');

            await page.reload();
            await palette.componentsTab.click();
            await palette.expand('Gates');

            await expect(palette.checkedCheckboxes).toHaveCount(0);
        });
    });

    test.describe('with the workspace', () => {
        let diagram: DiagramWorkspace;

        test.beforeEach(async ({ page }) => {
            diagram = new DiagramWorkspace(page);
            await expect(diagram.presenter).toBeVisible();
        });

        test('keeps the component selected after it is placed, so it can be placed again', async () => {
            await palette.expand('Gates');
            await palette.clickTile('AndGate');

            await diagram.clickFromCenterAt();

            await expect(palette.checkbox('AndGate')).toBeChecked();
        });

        test('Escape over the workspace clears the palette selection', async ({ page }) => {
            await palette.expand('Gates');
            await palette.expand('I/O');
            await palette.clickTile('Output');
            await expect(palette.checkbox('Output')).toBeChecked();

            await diagram.moveFromCenterTo();
            await page.keyboard.press('Escape');

            await expect(palette.checkedCheckboxes).toHaveCount(0);
            await expect(palette.checkbox('Output')).not.toBeChecked();
        });

        test('a component can be picked again after Escape cleared the selection', async ({ page }) => {
            await palette.expand('Gates');
            await palette.clickTile('XorGate');

            await diagram.moveFromCenterTo();
            await page.keyboard.press('Escape');
            await expect(palette.checkedCheckboxes).toHaveCount(0);

            await palette.clickTile('XorGate');

            await expect(palette.checkbox('XorGate')).toBeChecked();
        });
    });
});
