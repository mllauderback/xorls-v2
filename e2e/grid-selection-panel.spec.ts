import { expect, test } from '@playwright/test';
import { CATEGORIES, COMPONENTS, ComponentPalette } from './support/component-palette';

/**
 * The grid selection panel is the grid of component tiles inside one palette category. Each tile is a visually
 * hidden checkbox and a label holding the component's icon; clicking the label selects the component, and only one
 * component in the whole palette is selected at a time.
 */
test.describe('Grid selection panel', () => {
    let palette: ComponentPalette;

    test.beforeEach(async ({ page }) => {
        palette = new ComponentPalette(page);
        await palette.open();
    });

    test.describe('rendering', () => {
        for (const category of CATEGORIES) {
            test(`shows a tile for every ${category} component, in order`, async () => {
                await palette.expand(category);
                const grid = palette.grid(category);

                const ids = await grid.locator('.grid-selection-checkbox').evaluateAll(els => els.map(el => el.id));
                expect(ids).toEqual(COMPONENTS[category]);
                await expect(grid.locator('.grid-selection-label')).toHaveCount(COMPONENTS[category].length);
            });
        }

        test('pairs every label with its checkbox through the component type', async () => {
            for (const category of CATEGORIES) {
                await palette.expand(category);
                for (const type of COMPONENTS[category]) {
                    await expect(palette.checkbox(type)).toHaveAttribute('type', 'checkbox');
                    await expect(palette.tile(type)).toHaveAttribute('for', type);
                }
            }
        });

        test('draws an icon in every tile, described by its component type', async () => {
            for (const category of CATEGORIES) {
                await palette.expand(category);
                for (const type of COMPONENTS[category]) {
                    const svg = palette.tile(type).locator('app-palette-component-svgs svg');
                    await expect(svg).toBeVisible();
                    await expect(svg.locator('desc')).toHaveText(type);
                }
            }
            // a type the icon component doesn't know falls back to a message
            await expect(palette.root.getByText('Bad Component')).toHaveCount(0);
        });

        test('starts with nothing selected', async () => {
            for (const category of CATEGORIES) await palette.expand(category);
            await expect(palette.allCheckboxes).toHaveCount(
                CATEGORIES.reduce((n, c) => n + COMPONENTS[c].length, 0)
            );
            await expect(palette.checkedCheckboxes).toHaveCount(0);
        });

        test('hides the checkboxes and shows only the tiles', async () => {
            for (const category of CATEGORIES) {
                await palette.expand(category);

                for (const component of COMPONENTS[category]) {
                    const checkbox = palette.checkbox(component);

                    const style = await checkbox.evaluate(el => {
                        const s = getComputedStyle(el);
                        return { position: s.position, clipPath: s.clipPath, pointerEvents: s.pointerEvents };
                    });
                    expect(style.position).toBe('absolute');
                    expect(style.clipPath).toBe('inset(50%)');
                    expect(style.pointerEvents).toBe('none');

                    await expect(palette.tile(component)).toBeVisible();
                }
            }
        });

        test('shows the component type in a tooltip after hovering a tile', async ({ page }) => {
            for (const category of CATEGORIES) {
                await palette.expand(category);
                for (const component of COMPONENTS[category]) {
                    await palette.tile(component).hover();

                    const tooltip = page.locator('.p-tooltip');
                    // showDelay is 1000ms - 2000ms to prevent flakey tests
                    await expect(tooltip).toBeVisible({ timeout: 2000 });
                    await expect(tooltip).toHaveText(component);
                }
            }
        });
    });

    test.describe('selecting', () => {
        test.beforeEach(async () => {
            for (const category of CATEGORIES) {
                await palette.expand(category);
            }
        });

        test('selects a component when its tile is clicked', async () => {
            for (const category of CATEGORIES) {
                for (const component of COMPONENTS[category]) {
                    await palette.clickTile(component);

                    await expect(palette.checkbox(component)).toBeChecked();
                    await expect.poll(() => palette.checkedTypes()).toEqual([component]);
                }
            }
        });

        test('highlights the selected tile', async () => {
            for (const category of CATEGORIES) {
                for (const component of COMPONENTS[category]) {
                    const tile = palette.tile(component);
                    // move the mouse away first, so the hover style doesn't get in the way of the comparison
                    await palette.page.mouse.move(0, 0);
                    const before = await tile.evaluate(el => getComputedStyle(el).backgroundColor);

                    await palette.clickTile(component);
                    await palette.page.mouse.move(0, 0);

                    await expect.poll(() => tile.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(before);
                }
            }
        });

        test('deselects a component when its selected tile is clicked again', async () => {
            for (const category of CATEGORIES) {
                for (const component of COMPONENTS[category]) {
                    await palette.clickTile(component);
                    await expect(palette.checkbox(component)).toBeChecked();

                    await palette.clickTile(component);

                    await expect(palette.checkbox(component)).not.toBeChecked();
                    await expect(palette.checkedCheckboxes).toHaveCount(0);

                }
            }
        });

        test('moves the selection when another tile in the same category is clicked', async () => {
            await palette.clickTile('AndGate');
            await palette.clickTile('NorGate');

            await expect(palette.checkbox('AndGate')).not.toBeChecked();
            await expect(palette.checkbox('NorGate')).toBeChecked();
            await expect.poll(() => palette.checkedTypes()).toEqual(['NorGate']);
        });

        test('keeps only one selection while tiles are clicked one after another', async () => {
            for (const type of COMPONENTS['Gates']) {
                await palette.clickTile(type);
                await expect.poll(() => palette.checkedTypes()).toEqual([type]);
            }
        });

        test('can select a component again after deselecting it', async () => {
            for (const category of CATEGORIES) {
                for (const component of COMPONENTS[category]) {
                    await palette.clickTile(component);
                    await palette.clickTile(component);
                    await palette.clickTile(component);

                    await expect(palette.checkbox(component)).toBeChecked();
                }
            }
        });

        test('selects through the keyboard: Space on a focused checkbox', async () => {
            for (const category of CATEGORIES) {
                for (const component of COMPONENTS[category]) {
                    await palette.checkbox(component).focus();
                    await palette.page.keyboard.press('Space');
                    await expect(palette.checkbox(component)).toBeChecked();

                    await palette.page.keyboard.press('Space');
                    await expect(palette.checkbox(component)).not.toBeChecked();

                }
            }
        });

        // the next two tests don't provide a ton of coverage by themselves, but other tests would fail
        // if it weren't true for any/all combinations so I'm just going to leave them as-is.
        test('moves the selection to a tile in another category', async () => {
            await palette.clickTile('AndGate');
            await palette.clickTile('Input');

            await expect(palette.checkbox('AndGate')).not.toBeChecked();
            await expect(palette.checkbox('Input')).toBeChecked();
            await expect.poll(() => palette.checkedTypes()).toEqual(['Input']);
        });

        test('deselecting in one category leaves every category deselected', async () => {
            await palette.clickTile('AndGate');
            await palette.clickTile('Text');
            await palette.clickTile('Text');

            await expect(palette.checkedCheckboxes).toHaveCount(0);
        });
    });
});
