import type { Locator } from '@playwright/test';
import type { Layer } from './support/canvas-layer';
import { LAYERS } from './support/canvas-layer';
import { DiagramWorkspace, PAN_BUTTONS } from './support/diagram-workspace';
import { expect } from './support/draw-matchers';
import { settle } from './support/draw-helpers';
import { SettingsPanel } from './support/settings-panel';
import { test } from './support/test';

/**
 * The diagram workspace shows one diagram on a stack of canvas layers (the presenter) and handles what the user does
 * in it (the container and its controller): a picked palette component follows the mouse as a ghost, snapped to the
 * grid, a left click places it, a right or middle drag pans the diagram, and Escape cancels. The grid follows the workspace settings.
 *
 * Only AndGate has a draw() so far, so the tests place AndGates. An AndGate is 120x80 with its pins, and is placed
 * centered on the pointer.
 */
test.describe('Diagram workspace', () => {
    let diagram: DiagramWorkspace;
    let settingsPanel: SettingsPanel;

    test.beforeEach(async ({ page }) => {
        diagram = new DiagramWorkspace(page);
        await diagram.load();
    });

    test.describe('layers', () => {
        test('stacks a canvas for each layer, bottom to top', async () => {
            const stack = await diagram.canvases.evaluateAll((canvases: HTMLCanvasElement[]) =>
                canvases.map(c => ({ layer: c.parentElement!.tagName.toLowerCase(), zIndex: c.style.zIndex }))
            );

            expect(stack).toEqual(Object.values(LAYERS).map((layer, i) => ({ layer, zIndex: String(i) })));
        });

        test('gives the grid a white background and leaves the layers above it transparent', async () => {
            for (const layer of Object.keys(LAYERS) as Layer[]) {
                const background = await diagram.layer(layer).canvas.evaluate(c => getComputedStyle(c).backgroundColor);
                expect(background).toBe(layer === 'grid' ? 'rgb(255, 255, 255)' : 'rgba(0, 0, 0, 0)');
            }
        });

        test('makes every layer the same size, covering the workspace', async () => {
            const sizes = await diagram.canvases.evaluateAll((canvases: HTMLCanvasElement[]) =>
                canvases.map(c => ({ width: c.width, height: c.height }))
            );
            const box = (await diagram.presenter.boundingBox())!;

            expect(new Set(sizes.map(s => `${s.width}x${s.height}`)).size).toBe(1);
            expect(sizes[0].width).toBeGreaterThanOrEqual(Math.floor(box.width));
            expect(sizes[0].height).toBeGreaterThanOrEqual(Math.floor(box.height));
        });

        test('places each layer at the same top-left position', async () => {
            const boxes = await diagram.canvases.evaluateAll((canvases: HTMLCanvasElement[]) =>
                canvases.map(c => { const r = c.getBoundingClientRect(); return `${r.left},${r.top}`; })
            );

            expect(new Set(boxes).size).toBe(1);
        });

        test('draws the grid, and nothing else, in a new diagram', async () => {
            await expect.poll(() => diagram.layer('grid').drawn()).not.toBeNull();
            for (const layer of Object.keys(LAYERS).filter(l => l !== 'grid') as Layer[]) {
                expect(await diagram.layer(layer).drawn()).toBeNull();
            }
        });

        test('does not open the browser\'s context menu on the diagram', async () => {
            for (const layer of Object.keys(LAYERS) as Layer[]) {
                const prevented = await diagram.layer(layer).canvas.evaluate(canvas => {
                    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
                    return !canvas.dispatchEvent(event);
                });
                expect(prevented).toBe(true);
            }
        });
    });

    test.describe('ghost', () => {
        test('shows no ghost until a component is picked', async () => {
            await diagram.moveFromCenterTo({ x: -40, y: 0 });
            await diagram.moveFromCenterTo();

            expect(await diagram.layer('activeComponent').drawn()).toBeNull();
        });

        test('shows the picked component as a ghost under the mouse', async () => {
            await diagram.pickPaletteComponent();
            const pointer = await diagram.moveFromCenterTo();

            expect(await diagram.layer('activeComponent').drawnCenter()).toBeCenteredOn(pointer);
            expect(await diagram.layer('component').drawn()).toBeNull();
        });

        test('follows the mouse in whole grid cells', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            const from = (await diagram.layer('activeComponent').drawn())!;

            for (const move of [{ x: 7, y: 0 }, { x: 33, y: 0 }, { x: 0, y: 47 }, { x: -61, y: -18 }, { x: 100, y: 100 }]) {
                const pointer = await diagram.moveFromCenterTo(move);
                const to = (await diagram.layer('activeComponent').drawn())!;

                expect(to.left - from.left).toBeWholeCells();
                expect(to.top - from.top).toBeWholeCells();
                expect(await diagram.layer('activeComponent').drawnCenter()).toBeCenteredOn(pointer);
            }
        });

        test('keeps the ghost the same while the mouse stays in the same grid cell', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            const before = await diagram.layer('activeComponent').drawn();

            // a pixel is never enough to reach the next snap point from both sides: try both directions
            await diagram.moveFromCenterTo({ x: 1, y: 1 });
            const right = await diagram.layer('activeComponent').drawn();
            await diagram.moveFromCenterTo({ x: -1, y: -1 });
            const left = await diagram.layer('activeComponent').drawn();

            expect([right, left]).toContainEqual(before);
        });

        test('removes the ghost when the component is unpicked in the palette', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await expect.poll(() => diagram.layer('activeComponent').drawn()).not.toBeNull();

            await diagram.palette.clickTile('AndGate');
            await settle(diagram.page);

            expect(await diagram.layer('activeComponent').drawn()).toBeNull();
        });

        test('shows the ghost again as soon as the mouse comes back after it was unpicked and picked', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await diagram.palette.clickTile('AndGate');
            await settle(diagram.page);

            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo({ x: 40, y: 40 });

            await expect.poll(() => diagram.layer('activeComponent').drawn()).not.toBeNull();
        });
    });

    test.describe('placing', () => {
        test('places the picked component where its ghost is when the diagram is clicked', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            const ghost = (await diagram.layer('activeComponent').drawn())!;

            await diagram.clickFromCenterAt();

            expect(await diagram.layer('component').drawn()).toCoverSameBoxAs(ghost);
        });

        test('places a component without the mouse having moved over the diagram first', async ({ page }) => {
            await diagram.pickPaletteComponent();
            const point = await diagram.atCenter({ x: 60, y: 20 });

            // a single jump and a click, like a tap
            await page.mouse.move(point.x, point.y);
            await page.mouse.click(point.x, point.y);
            await settle(diagram.page);

            expect(await diagram.layer('component').drawnCenter()).toBeCenteredOn(point);
        });

        test('keeps the component picked after placing it, with a new ghost under the mouse', async () => {
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt();

            await expect(diagram.palette.checkbox('AndGate')).toBeChecked();
            expect(await diagram.layer('activeComponent').drawn()).not.toBeNull();
        });

        test('places the component again with every click', async () => {
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt({ x: -200, y: -100 });
            const one = (await diagram.layer('component').drawn())!;

            await diagram.clickFromCenterAt({ x: 200, y: 100 });
            const two = (await diagram.layer('component').drawn())!;

            expect(two.count).toBeGreaterThan(one.count);
            expect(two.right - two.left).toBeGreaterThan(one.right - one.left);
            expect(two.bottom - two.top).toBeGreaterThan(one.bottom - one.top);
        });

        test('places components on the grid with pointer off grid lines', async () => {
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt();
            const first = (await diagram.layer('component').drawn())!;
            await diagram.page.keyboard.press('Escape');
            await settle(diagram.page);

            // a second one, far enough not to overlap, at an offset that is not a whole number of cells
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt({ x: 0, y: 167 });
            const both = (await diagram.layer('component').drawn())!;

            expect(both.left).toBe(first.left);
            expect(both.bottom - first.bottom).toBeWholeCells();
        });

        test('does not place anything without a picked component', async () => {
            await diagram.clickFromCenterAt();

            expect(await diagram.layer('component').drawn()).toBeNull();
            expect(await diagram.layer('activeComponent').drawn()).toBeNull();
        });

        for (const button of ['right', 'middle'] as const) {
            test(`does not place anything with a ${button} click`, async () => {
                await diagram.pickPaletteComponent();
                await diagram.clickFromCenterAt({ x: 0, y: 0 }, button);

                expect(await diagram.layer('component').drawn()).toBeNull();
                expect(await diagram.layer('activeComponent').drawn()).not.toBeNull();
            });
        }

        test('does not place anything when the mouse moves more than a couple of pixels while pressed', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();

            await diagram.drag({ x: 0, y: 0 }, { x: 30, y: 0 });

            expect(await diagram.layer('component').drawn()).toBeNull();
        });

        test('places a component when the mouse moves only a pixel or two while pressed', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();

            await diagram.drag({ x: 0, y: 0 }, { x: 1, y: 1 });

            expect(await diagram.layer('component').drawn()).not.toBeNull();
        });
    });

    test.describe('Escape', () => {
        test('cancels the placement: the ghost goes and the palette is unpicked', async ({ page }) => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await expect.poll(() => diagram.layer('activeComponent').drawn()).not.toBeNull();

            await page.keyboard.press('Escape');
            await settle(diagram.page);

            expect(await diagram.layer('activeComponent').drawn()).toBeNull();
            await expect(diagram.palette.checkedCheckboxes).toHaveCount(0);
        });

        test('keeps the components that were placed', async ({ page }) => {
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt();
            const placed = await diagram.layer('component').drawn();

            await page.keyboard.press('Escape');
            await settle(diagram.page);

            expect(await diagram.layer('component').drawn()).toEqual(placed);
        });

        test('stops placing: clicking afterwards places nothing', async ({ page }) => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await page.keyboard.press('Escape');

            await diagram.clickFromCenterAt({ x: 80, y: 80 });

            expect(await diagram.layer('component').drawn()).toBeNull();
            expect(await diagram.layer('activeComponent').drawn()).toBeNull();
        });

        test('cancels while the mouse is outside the diagram too', async ({ page }) => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await page.mouse.move(5, 5);

            await page.keyboard.press('Escape');
            await settle(diagram.page);

            await expect(diagram.palette.checkedCheckboxes).toHaveCount(0);
            expect(await diagram.layer('activeComponent').drawn()).toBeNull();
        });

        test('is left alone while typing in a field', async ({ page }) => {
            const settingsPanel = new SettingsPanel(page);

            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await settingsPanel.openGridSettings();
            await page.locator('#gridSpacing').focus();

            await page.keyboard.press('Escape');
            await settle(diagram.page);

            await expect(diagram.palette.checkbox('AndGate')).toBeChecked();
            expect(await diagram.layer('activeComponent').drawn()).not.toBeNull();
        });
    });

    test.describe('panning', () => {
        for (const button of PAN_BUTTONS) {
            test(`moves the diagram with a ${button} drag`, async () => {
                await diagram.place();
                const before = (await diagram.layer('component').drawn())!;

                await diagram.pan({ x: 200, y: 150 }, { x: -73, y: 41 }, { button });

                const after = (await diagram.layer('component').drawn())!;
                expect(after.left - before.left).toBe(-73);
                expect(after.top - before.top).toBe(41);
                expect(after.count).toBe(before.count);
            });
        }

        test("does not let a middle press start the browser's autoscroll, except in a field", async ({ page }) => {
            /** Whether a middle mousedown on the element is cancelled, which is what keeps autoscroll from starting. */
            const middlePressCancelled = (target: Locator) => target.evaluate(el => {
                const event = new MouseEvent('mousedown', { button: 1, bubbles: true, cancelable: true });
                return !el.dispatchEvent(event);
            });

            expect(await middlePressCancelled(diagram.layer('activeWire').canvas)).toBe(true);
            expect(await middlePressCancelled(page.locator('body'))).toBe(true);

            // a middle press in a field is left alone, for middle-click paste
            await new SettingsPanel(page).openGridSettings();
            expect(await middlePressCancelled(page.locator('#gridSpacing'))).toBe(false);
        });

        test('does not move the diagram with a left drag, which places and selects', async () => {
            await diagram.place();
            const before = (await diagram.layer('component').drawn())!;

            await diagram.drag({ x: 200, y: 150 }, { x: -73, y: 41 });

            expect(await diagram.layer('component').drawn()).toEqual(before);
            expect(await diagram.cursor()).not.toBe('grabbing');
        });

        test('moves the diagram in steps that add up', async () => {
            await diagram.place();
            const before = (await diagram.layer('component').drawn())!;

            await diagram.pan({ x: 200, y: 150 }, { x: 50, y: 0 });
            await diagram.pan({ x: 200, y: 150 }, { x: 0, y: -30 });
            await diagram.pan({ x: 200, y: 150 }, { x: -20, y: 10 });

            const after = (await diagram.layer('component').drawn())!;
            expect(after.left - before.left).toBe(30);
            expect(after.top - before.top).toBe(-20);
        });

        test('shows the grabbing cursor while dragging, and the default one after', async () => {
            await diagram.pan({ x: 0, y: 0 }, { x: 40, y: 0 }, { release: false });
            expect(await diagram.cursor()).toBe('grabbing');

            await diagram.releasePan();
            expect(await diagram.cursor()).toBe('default');
        });

        test('ends the pan when the mouse is released outside the diagram', async ({ page }) => {
            await diagram.place();
            await diagram.pan({ x: 0, y: 0 }, { x: 40, y: 0 }, { release: false });

            await page.mouse.move(5, 5, { steps: 5 });
            await diagram.releasePan();
            expect(await diagram.cursor()).toBe('default');
            const after = await diagram.layer('component').drawn();

            // moving over the diagram again doesn't pan it
            await diagram.moveFromCenterTo({ x: 100, y: 100 });
            await diagram.moveFromCenterTo({ x: -100, y: -100 });
            expect(await diagram.layer('component').drawn()).toEqual(after);
        });

        test('pans instead of placing when right dragging with a picked component, carrying the ghost along', async () => {
            await diagram.place();
            const before = (await diagram.layer('component').drawn())!;
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo({ x: 250, y: 0 });
            const ghostBefore = (await diagram.layer('activeComponent').drawn())!;

            await diagram.pan({ x: 250, y: 0 }, { x: -40, y: 0 });

            const after = (await diagram.layer('component').drawn())!;
            expect(after.left - before.left).toBe(-40);
            expect(after.count).toBe(before.count);
            const ghostAfter = (await diagram.layer('activeComponent').drawn())!;
            expect(ghostAfter.left - ghostBefore.left).toBe(-40);
        });

        test('neither pans nor places when left dragging with a picked component', async () => {
            await diagram.place();
            const before = (await diagram.layer('component').drawn())!;
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo({ x: 250, y: 0 });

            await diagram.drag({ x: 250, y: 0 }, { x: -40, y: 0 });

            expect(await diagram.layer('component').drawn()).toEqual(before);
            // the ghost kept following the mouse instead
            expect(await diagram.layer('activeComponent').drawnCenter()).toBeCenteredOn(await diagram.atCenter({ x: 210, y: 0 }));
        });

        test('grows the canvases when panning brings an edge into view, keeping the diagram where it was', async () => {
            await diagram.place();
            const sizeOf = () => diagram.canvases.evaluateAll((cs: HTMLCanvasElement[]) => cs.map(c => `${c.width}x${c.height}`));
            const sizesBefore = await sizeOf();
            const before = (await diagram.layer('component').drawn())!;

            // dragging right and down brings the left and top edges into view
            await diagram.pan({ x: -200, y: -150 }, { x: 120, y: 90 });

            const sizesAfter = await sizeOf();
            expect(new Set(sizesAfter).size).toBe(1);
            expect(sizesAfter[0]).not.toBe(sizesBefore[0]);
            const after = (await diagram.layer('component').drawn())!;
            expect(after.left - before.left).toBe(120);
            expect(after.top - before.top).toBe(90);

            // the grid still covers the workspace
            const box = (await diagram.presenter.boundingBox())!;
            const rect = await diagram.layer('grid').canvas.evaluate(c => c.getBoundingClientRect().toJSON());
            expect(rect.left).toBeLessThanOrEqual(box.x);
            expect(rect.top).toBeLessThanOrEqual(box.y);
        });

        test('places components under the mouse after panning', async () => {
            await diagram.pan({ x: 0, y: 0 }, { x: 137, y: -64 });
            await diagram.pickPaletteComponent();

            const point = await diagram.clickFromCenterAt({ x: -50, y: 30 });

            expect(await diagram.layer('component').drawnCenter()).toBeCenteredOn(point);
        });

        test('keeps components on the grid after panning by part of a cell', async () => {
            await diagram.place();
            const first = (await diagram.layer('component').drawn())!;

            await diagram.pan({ x: 200, y: 200 }, { x: 7, y: 0 });
            const panned = (await diagram.layer('component').drawn())!;
            await diagram.place({ x: 0, y: 160 });
            const both = (await diagram.layer('component').drawn())!;

            // the new one lines up with the old one, which moved by 7px with the grid
            expect(panned.left - first.left).toBe(7);
            expect(both.left).toBe(panned.left);
        });
    });

    test.describe('grid settings', () => {
        test.beforeEach(async ({ page }) => {
            settingsPanel = new SettingsPanel(page);
        });
        test('snaps the ghost to the new cell size', async () => {
            const spacing = 50;
            await settingsPanel.openGridSettings();
            await settingsPanel.setGridSpacing(spacing);
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            const from = (await diagram.layer('activeComponent').drawn())!;

            for (const move of [{ x: 13, y: 0 }, { x: 0, y: 37 }, { x: 71, y: -88 }, { x: -140, y: 26 }]) {
                const pointer = await diagram.moveFromCenterTo(move);
                const to = (await diagram.layer('activeComponent').drawn())!;

                expect(to.left - from.left).toBeWholeCells(spacing);
                expect(to.top - from.top).toBeWholeCells(spacing);
                expect(await diagram.layer('activeComponent').drawnCenter()).toBeCenteredOn(pointer, spacing);
            }
        });
    });
});
