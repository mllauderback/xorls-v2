import { test } from '@playwright/test';
import type { Layer } from './support/diagram-workspace';
import { DEFAULT_GRID_SPACING, DiagramWorkspace, LAYERS } from './support/diagram-workspace';
import { expect } from './support/draw-matchers';
import { settle } from './support/draw-helpers';
import { SettingsPanel } from './support/settings-panel';

/**
 * The diagram workspace shows one diagram on a stack of canvas layers (the presenter) and handles what the user does
 * in it (the container and its controller): a picked palette component follows the mouse as a ghost, snapped to the
 * grid, a click places it, a drag pans the diagram, and Escape cancels. The grid follows the workspace settings.
 *
 * Only AndGate has a draw() so far, so the tests place AndGates. An AndGate is 120x80 with its pins, and is placed
 * centered on the pointer.
 */
test.describe('Diagram workspace', () => {
    let diagram: DiagramWorkspace;
    let settingsPanel: SettingsPanel;

    test.beforeEach(async ({ page }) => {
        diagram = new DiagramWorkspace(page);
        await diagram.open();
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
                const background = await diagram.canvas(layer).evaluate(c => getComputedStyle(c).backgroundColor);
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
            await expect.poll(() => diagram.drawn('grid')).not.toBeNull();
            for (const layer of Object.keys(LAYERS).filter(l => l !== 'grid') as Layer[]) {
                expect(await diagram.drawn(layer)).toBeNull();
            }
        });

        test('does not open the browser\'s context menu on the diagram', async () => {
            for (const layer of Object.keys(LAYERS) as Layer[]) {
                const prevented = await diagram.canvas(layer).evaluate(canvas => {
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

            expect(await diagram.drawn('activeComponent')).toBeNull();
        });

        test('shows the picked component as a ghost under the mouse', async () => {
            await diagram.pickPaletteComponent();
            const pointer = await diagram.moveFromCenterTo();

            expect(await diagram.drawnCenter('activeComponent')).toBeCenteredOn(pointer);
            expect(await diagram.drawn('component')).toBeNull();
        });

        // should also test ghost alpha > placed alpha
        test('draws the ghost fainter than a placed component', async () => {
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt({ x: -150, y: 0 });
            await diagram.moveFromCenterTo({ x: 150, y: 0 });

            const ghost = (await diagram.drawn('activeComponent'))!;
            const placed = (await diagram.drawn('component'))!;
            const lightness = (c: { r: number, g: number, b: number }) => c.r + c.g + c.b;

            expect(lightness(ghost.color)).toBeGreaterThan(lightness(placed.color));
        });

        test('follows the mouse in whole grid cells', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            const from = (await diagram.drawn('activeComponent'))!;

            for (const move of [{ x: 7, y: 0 }, { x: 33, y: 0 }, { x: 0, y: 47 }, { x: -61, y: -18 }, { x: 100, y: 100 }]) {
                const pointer = await diagram.moveFromCenterTo(move);
                const to = (await diagram.drawn('activeComponent'))!;

                expect(to.left - from.left).toBeWholeCells();
                expect(to.top - from.top).toBeWholeCells();
                expect(await diagram.drawnCenter('activeComponent')).toBeCenteredOn(pointer);
            }
        });

        test('keeps the ghost the same while the mouse stays in the same grid cell', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            const before = await diagram.drawn('activeComponent');

            // a pixel is never enough to reach the next snap point from both sides: try both directions
            await diagram.moveFromCenterTo({ x: 1, y: 1 });
            const right = await diagram.drawn('activeComponent');
            await diagram.moveFromCenterTo({ x: -1, y: -1 });
            const left = await diagram.drawn('activeComponent');

            expect([right, left]).toContainEqual(before);
        });

        test('removes the ghost when the component is unpicked in the palette', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await expect.poll(() => diagram.drawn('activeComponent')).not.toBeNull();

            await diagram.palette.clickTile('AndGate');
            await settle(diagram.page);

            expect(await diagram.drawn('activeComponent')).toBeNull();
        });

        test('shows the ghost again as soon as the mouse comes back after it was unpicked and picked', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await diagram.palette.clickTile('AndGate');
            await settle(diagram.page);

            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo({ x: 40, y: 40 });

            await expect.poll(() => diagram.drawn('activeComponent')).not.toBeNull();
        });
    });

    test.describe('placing', () => {
        test('places the picked component where its ghost is when the diagram is clicked', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            const ghost = (await diagram.drawn('activeComponent'))!;

            await diagram.clickFromCenterAt();

            expect(await diagram.drawn('component')).toCoverSameBoxAs(ghost);
        });

        test('places a component without the mouse having moved over the diagram first', async ({ page }) => {
            await diagram.pickPaletteComponent();
            const point = await diagram.atCenter({ x: 60, y: 20 });

            // a single jump and a click, like a tap
            await page.mouse.move(point.x, point.y);
            await page.mouse.click(point.x, point.y);
            await settle(diagram.page);

            expect(await diagram.drawnCenter('component')).toBeCenteredOn(point);
        });

        test('keeps the component picked after placing it, with a new ghost under the mouse', async () => {
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt();

            await expect(diagram.palette.checkbox('AndGate')).toBeChecked();
            expect(await diagram.drawn('activeComponent')).not.toBeNull();
        });

        test('places the component again with every click', async () => {
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt({ x: -200, y: -100 });
            const one = (await diagram.drawn('component'))!;

            await diagram.clickFromCenterAt({ x: 200, y: 100 });
            const two = (await diagram.drawn('component'))!;

            expect(two.count).toBeGreaterThan(one.count);
            expect(two.right - two.left).toBeGreaterThan(one.right - one.left);
            expect(two.bottom - two.top).toBeGreaterThan(one.bottom - one.top);
        });

        test('places components on the grid with pointer off grid lines', async () => {
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt();
            const first = (await diagram.drawn('component'))!;
            await diagram.page.keyboard.press('Escape');
            await settle(diagram.page);

            // a second one, far enough not to overlap, at an offset that is not a whole number of cells
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt({ x: 0, y: 167 });
            const both = (await diagram.drawn('component'))!;

            expect(both.left).toBe(first.left);
            expect(both.bottom - first.bottom).toBeWholeCells();
        });

        test('does not place anything without a picked component', async () => {
            await diagram.clickFromCenterAt();

            expect(await diagram.drawn('component')).toBeNull();
            expect(await diagram.drawn('activeComponent')).toBeNull();
        });

        for (const button of ['right', 'middle'] as const) {
            test(`does not place anything with a ${button} click`, async () => {
                await diagram.pickPaletteComponent();
                await diagram.clickFromCenterAt({ x: 0, y: 0 }, button);

                expect(await diagram.drawn('component')).toBeNull();
                expect(await diagram.drawn('activeComponent')).not.toBeNull();
            });
        }

        test('does not place anything when the mouse moves more than a couple of pixels while pressed', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();

            await diagram.drag({ x: 0, y: 0 }, { x: 30, y: 0 });

            expect(await diagram.drawn('component')).toBeNull();
        });

        test('places a component when the mouse moves only a pixel or two while pressed', async () => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();

            await diagram.drag({ x: 0, y: 0 }, { x: 1, y: 1 });

            expect(await diagram.drawn('component')).not.toBeNull();
        });
    });

    test.describe('Escape', () => {
        test('cancels the placement: the ghost goes and the palette is unpicked', async ({ page }) => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await expect.poll(() => diagram.drawn('activeComponent')).not.toBeNull();

            await page.keyboard.press('Escape');
            await settle(diagram.page);

            expect(await diagram.drawn('activeComponent')).toBeNull();
            await expect(diagram.palette.checkedCheckboxes).toHaveCount(0);
        });

        test('keeps the components that were placed', async ({ page }) => {
            await diagram.pickPaletteComponent();
            await diagram.clickFromCenterAt();
            const placed = await diagram.drawn('component');

            await page.keyboard.press('Escape');
            await settle(diagram.page);

            expect(await diagram.drawn('component')).toEqual(placed);
        });

        test('stops placing: clicking afterwards places nothing', async ({ page }) => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await page.keyboard.press('Escape');

            await diagram.clickFromCenterAt({ x: 80, y: 80 });

            expect(await diagram.drawn('component')).toBeNull();
            expect(await diagram.drawn('activeComponent')).toBeNull();
        });

        test('cancels while the mouse is outside the diagram too', async ({ page }) => {
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await page.mouse.move(5, 5);

            await page.keyboard.press('Escape');
            await settle(diagram.page);

            await expect(diagram.palette.checkedCheckboxes).toHaveCount(0);
            expect(await diagram.drawn('activeComponent')).toBeNull();
        });

        test('is left alone while typing in a field', async ({ page }) => {
            let settingsPanel = new SettingsPanel(page);

            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            await settingsPanel.openGridSettings();
            await page.locator('#gridSpacing').focus();

            await page.keyboard.press('Escape');
            await settle(diagram.page);

            await expect(diagram.palette.checkbox('AndGate')).toBeChecked();
            expect(await diagram.drawn('activeComponent')).not.toBeNull();
        });
    });

    test.describe('panning', () => {
        test('moves the diagram with a drag', async () => {
            await diagram.place();
            const before = (await diagram.drawn('component'))!;

            await diagram.drag({ x: 200, y: 150 }, { x: -73, y: 41 });

            const after = (await diagram.drawn('component'))!;
            expect(after.left - before.left).toBe(-73);
            expect(after.top - before.top).toBe(41);
            expect(after.count).toBe(before.count);
        });

        test('moves the grid with the diagram', async () => {
            // what is shown in the workspace, not the whole canvas, which may grow while panning
            const view = () => diagram.presenter.screenshot({ animations: 'disabled' });
            const before = await view();

            // half a cell: the grid is shown shifted
            await diagram.drag({ x: 0, y: 0 }, { x: DEFAULT_GRID_SPACING / 2, y: DEFAULT_GRID_SPACING / 2 });
            expect((await view()).equals(before)).toBe(false);

            // another half, and some whole cells: the grid lines up the way it started
            await diagram.drag({ x: 0, y: 0 }, { x: DEFAULT_GRID_SPACING * 2.5, y: DEFAULT_GRID_SPACING * 1.5 });
            expect((await view()).equals(before)).toBe(true);
        });

        test('moves the diagram in steps that add up', async () => {
            await diagram.place();
            const before = (await diagram.drawn('component'))!;

            await diagram.drag({ x: 200, y: 150 }, { x: 50, y: 0 });
            await diagram.drag({ x: 200, y: 150 }, { x: 0, y: -30 });
            await diagram.drag({ x: 200, y: 150 }, { x: -20, y: 10 });

            const after = (await diagram.drawn('component'))!;
            expect(after.left - before.left).toBe(30);
            expect(after.top - before.top).toBe(-20);
        });

        test('shows the grabbing cursor while dragging, and the default one after', async ({ page }) => {
            await diagram.drag({ x: 0, y: 0 }, { x: 40, y: 0 }, false);
            expect(await diagram.cursor()).toBe('grabbing');

            await page.mouse.up();
            expect(await diagram.cursor()).toBe('default');
        });

        test('ends the pan when the mouse is released outside the diagram', async ({ page }) => {
            await diagram.place();
            await diagram.drag({ x: 0, y: 0 }, { x: 40, y: 0 }, false);

            await page.mouse.move(5, 5, { steps: 5 });
            await page.mouse.up();
            expect(await diagram.cursor()).toBe('default');
            const after = await diagram.drawn('component');

            // moving over the diagram again doesn't pan it
            await diagram.moveFromCenterTo({ x: 100, y: 100 });
            await diagram.moveFromCenterTo({ x: -100, y: -100 });
            expect(await diagram.drawn('component')).toEqual(after);
        });

        // this test might change later - im not sure i like this behavior.
        test('pans instead of placing when dragging with a picked component', async () => {
            await diagram.place();
            const before = (await diagram.drawn('component'))!;
            await diagram.pickPaletteComponent();

            await diagram.drag({ x: 250, y: 0 }, { x: -40, y: 0 });

            const after = (await diagram.drawn('component'))!;
            expect(after.left - before.left).toBe(-40);
            expect(after.count).toBe(before.count);
        });

        test('grows the canvases when panning brings an edge into view, keeping the diagram where it was', async () => {
            await diagram.place();
            const sizeOf = () => diagram.canvases.evaluateAll((cs: HTMLCanvasElement[]) => cs.map(c => `${c.width}x${c.height}`));
            const sizesBefore = await sizeOf();
            const before = (await diagram.drawn('component'))!;

            // dragging right and down brings the left and top edges into view
            await diagram.drag({ x: -200, y: -150 }, { x: 120, y: 90 });

            const sizesAfter = await sizeOf();
            expect(new Set(sizesAfter).size).toBe(1);
            expect(sizesAfter[0]).not.toBe(sizesBefore[0]);
            const after = (await diagram.drawn('component'))!;
            expect(after.left - before.left).toBe(120);
            expect(after.top - before.top).toBe(90);

            // the grid still covers the workspace
            const box = (await diagram.presenter.boundingBox())!;
            const rect = await diagram.canvas('grid').evaluate(c => c.getBoundingClientRect().toJSON());
            expect(rect.left).toBeLessThanOrEqual(box.x);
            expect(rect.top).toBeLessThanOrEqual(box.y);
        });

        test('places components under the mouse after panning', async () => {
            await diagram.drag({ x: 0, y: 0 }, { x: 137, y: -64 });
            await diagram.pickPaletteComponent();

            const point = await diagram.clickFromCenterAt({ x: -50, y: 30 });

            expect(await diagram.drawnCenter('component')).toBeCenteredOn(point);
        });

        test('keeps components on the grid after panning by part of a cell', async () => {
            await diagram.place();
            const first = (await diagram.drawn('component'))!;

            await diagram.drag({ x: 200, y: 200 }, { x: 7, y: 0 });
            const panned = (await diagram.drawn('component'))!;
            await diagram.place({ x: 0, y: 160 });
            const both = (await diagram.drawn('component'))!;

            // the new one lines up with the old one, which moved by 7px with the grid
            expect(panned.left - first.left).toBe(7);
            expect(both.left).toBe(panned.left);
        });
    });

    test.describe('grid settings', () => {
        test.beforeEach(async ({ page }) => {
            settingsPanel = new SettingsPanel(page);
        });
        // perhaps better under grid canvas layer tests
        test('redraws the grid when its display mode changes', async () => {
            const dots = (await diagram.drawn('grid'))!;

            await settingsPanel.openGridSettings();
            await settingsPanel.setGridMode('lines');
            await expect.poll(async () => (await diagram.drawn('grid'))!.count).toBeGreaterThan(dots.count);

            await settingsPanel.setGridMode('dots');
            await expect.poll(async () => (await diagram.drawn('grid'))!.count).toBe(dots.count);
        });

        // perhaps better under grid canvas layer tests
        test('redraws the grid when its cell size changes', async () => {
            const before = (await diagram.drawn('grid'))!;

            await settingsPanel.openGridSettings();
            await settingsPanel.setGridSpacing(DEFAULT_GRID_SPACING * 2);

            // twice the spacing: a quarter of the dots
            await expect.poll(async () => (await diagram.drawn('grid'))!.count).toBeLessThan(before.count / 2);
        });

        test('snaps the ghost to the new cell size', async () => {
            const spacing = 50;
            await settingsPanel.openGridSettings();
            await settingsPanel.setGridSpacing(spacing);
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            const from = (await diagram.drawn('activeComponent'))!;

            for (const move of [{ x: 13, y: 0 }, { x: 0, y: 37 }, { x: 71, y: -88 }, { x: -140, y: 26 }]) {
                const pointer = await diagram.moveFromCenterTo(move);
                const to = (await diagram.drawn('activeComponent'))!;

                expect(to.left - from.left).toBeWholeCells(spacing);
                expect(to.top - from.top).toBeWholeCells(spacing);
                expect(await diagram.drawnCenter('activeComponent')).toBeCenteredOn(pointer, spacing);
            }
        });
    });
});
