import type { Locator } from '@playwright/test';
import type { CanvasLayer, Drawn, Layer } from './support/canvas-layer';
import { LAYERS, runs } from './support/canvas-layer';
import { DEFAULT_GRID_SPACING, DiagramWorkspace, PAN_BUTTONS } from './support/diagram-workspace';
import { expect } from './support/draw-matchers';
import { settle } from './support/draw-helpers';
import { SettingsPanel } from './support/settings-panel';
import { Sidebar } from './support/sidebar';
import { addTextField } from './support/text-field';
import { CATEGORIES, ComponentPalette } from './support/component-palette';
import { test } from './support/test';

/** The component layers stroke gates with lines this many pixels wide, at the default grid spacing. */
const LINE_WIDTH = 2;

/** Every gate in the palette, with the size of its bounding box in grid cells: input pins, body and output pin. */
const GATES = [
    { type: 'AndGate', cells: { width: 6, height: 4 } },
    { type: 'OrGate', cells: { width: 6, height: 4 } },
    { type: 'XorGate', cells: { width: 6, height: 4 } },
    { type: 'NotGate', cells: { width: 4, height: 2 } },
    { type: 'Buffer', cells: { width: 4, height: 2 } },
    { type: 'NandGate', cells: { width: 6, height: 4 } },
    { type: 'NorGate', cells: { width: 6, height: 4 } },
    { type: 'XnorGate', cells: { width: 6, height: 4 } },
] as const;

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

    test.describe('Gates', () => {
        let diagram: DiagramWorkspace;
        let settings: SettingsPanel;
        let components: CanvasLayer;
        let activeLayer: CanvasLayer;

        test.beforeEach(async ({ page }) => {
            diagram = new DiagramWorkspace(page);
            settings = new SettingsPanel(page);
            components = diagram.layer('component');
            activeLayer = diagram.layer('activeComponent');
            await diagram.load();
        });

        /** The grid lines shown in the workspace, in client coordinates. The grid has to be in lines mode. */
        async function gridLines(): Promise<{ x: number[], y: number[] }> {
            const { region, columns, rows } = await diagram.layer('grid').profile();
            const xs = runs(columns, region.left, count => count > region.height / 2).map(run => run.end);
            const ys = runs(rows, region.top, count => count > region.width / 2).map(run => run.end);
            return { x: xs, y: ys };
        }

        /** Switches the grid to lines, with a cell size, and waits until it is drawn that way. */
        async function useGrid(spacing: number) {
            await settings.openGridSettings();
            await settings.setGridMode('lines');
            if (spacing !== DEFAULT_GRID_SPACING) await settings.setGridSpacing(spacing);
            await expect.poll(async () => {
                const { x } = await gridLines();
                return x.length > 1 ? x[1] - x[0] : 0;
            }).toBe(spacing);
        }

        /** Places a gate in the middle of the workspace and returns what the component layer draws. */
        async function place(type: string): Promise<Drawn> {
            await diagram.place({ x: 0, y: 0 }, type);
            await expect.poll(async () => (await components.drawn())?.count ?? 0).toBeGreaterThan(0);
            return (await components.drawn())!;
        }

        function width(drawn: Drawn) {
            return drawn.right - drawn.left + 1;
        }
        function height(drawn: Drawn) {
            return drawn.bottom - drawn.top + 1;
        }

        /** The gate's pins are on grid lines: the left end of its inputs and the right end of its output. */
        async function expectPinsOnGridLines(drawn: Drawn) {
            const lines = await gridLines();
            // the input pins start on the column of the left line; the output pin ends just before the right line
            expect(lines.x).toContain(drawn.left);
            expect(lines.x).toContain(drawn.right + 1);
            // the middle of a gate is a grid row: between its two inputs, or on the pin of a one-input gate
            const middle = (drawn.top + drawn.bottom) / 2;
            const nearestRow = Math.min(...lines.y.map(y => Math.abs(y - middle)));
            expect(nearestRow).toBeLessThanOrEqual(1);
        }

        for (const { type, cells } of GATES) {
            test.describe(type, () => {
                test('is drawn as big as its bounding box', async () => {
                    const drawn = await place(type);

                    // the pins end on the box's left and right sides with square ends
                    expect(width(drawn)).toBe(cells.width * DEFAULT_GRID_SPACING);
                    // the top and bottom of the body are centered on the box's top and bottom sides
                    expect(Math.abs(height(drawn) - (cells.height * DEFAULT_GRID_SPACING + LINE_WIDTH)))
                        .toBeLessThanOrEqual(1);
                });

                test('has its pins on grid lines when it is placed', async () => {
                    await useGrid(DEFAULT_GRID_SPACING);

                    await expectPinsOnGridLines(await place(type));
                });

                test('previews a ghost as big as its bounding box, centered on the pointer', async () => {
                    await diagram.pickPaletteComponent(type);

                    for (const move of [{ x: 0, y: 0 }, { x: 37, y: -13 }, { x: -71, y: 52 }]) {
                        const pointer = await diagram.moveFromCenterTo(move);
                        await settle(diagram.page);
                        const ghost = (await activeLayer.drawn())!;

                        expect(width(ghost)).toBe(cells.width * DEFAULT_GRID_SPACING);
                        expect(await activeLayer.drawnCenter()).toBeCenteredOn(pointer);
                    }
                });

                test('is scaled with the grid spacing, with its pins still on grid lines', async () => {
                    const spacing = 50;
                    await useGrid(spacing);

                    const drawn = await place(type);

                    expect(width(drawn)).toBe(cells.width * spacing);
                    await expectPinsOnGridLines(drawn);
                });
            });
        }

        test.describe('line widths', () => {
            /** How many pixels thick the output pin is: it is the only line in a gate's right-most column. */
            async function outputPinWidth(layer: CanvasLayer) {
                const drawn = (await layer.drawn())!;
                const { columns } = await layer.profile({
                    left: drawn.right, top: drawn.top, width: 1, height: drawn.bottom - drawn.top + 1,
                });
                return columns[0];
            }

            for (const spacing of [DEFAULT_GRID_SPACING, 50]) {
                test(`strokes a placed gate ${LINE_WIDTH}px wide with ${spacing}px cells`, async () => {
                    await useGrid(spacing);

                    await place('AndGate');

                    // 2px centered on a pixel edge: exactly two rows
                    expect(await outputPinWidth(components)).toBe(LINE_WIDTH);
                });
            }

            test('keeps the ghost the same width in pixels when the grid spacing changes', async () => {
                await diagram.pickPaletteComponent('AndGate');
                await diagram.moveFromCenterTo();
                await settle(diagram.page);
                const atDefault = await outputPinWidth(activeLayer);

                await useGrid(50);
                await diagram.moveFromCenterTo({ x: 7, y: 3 });
                await settle(diagram.page);

                // the ghost is bolder than a placed gate, and stays that bold
                expect(atDefault).toBeGreaterThan(LINE_WIDTH);
                expect(await outputPinWidth(activeLayer)).toBe(atDefault);
            });
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
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            const field = await addTextField(page);
            await field.focus();

            await page.keyboard.press('Escape');
            await settle(diagram.page);

            await expect(diagram.palette.checkbox('AndGate')).toBeChecked();
            expect(await diagram.layer('activeComponent').drawn()).not.toBeNull();
        });

        test.describe('after another sidebar tab was clicked', () => {
            // a sidebar tab keeps every key it gets from reaching the window, so the diagram has to take the focus back
            test.beforeEach(async ({ page }) => {
                await diagram.pickPaletteComponent();
                await diagram.moveFromCenterTo();
                await new Sidebar(page).open('settings');
                await expect(page.getByTestId('settingsTab')).toBeFocused();
            });

            test('cancels once the mouse is back over the diagram', async ({ page }) => {
                await diagram.moveFromCenterTo({ x: 30, y: 20 });
                await expect.poll(() => diagram.layer('activeComponent').drawn()).not.toBeNull();

                await page.keyboard.press('Escape');
                await settle(diagram.page);

                expect(await diagram.layer('activeComponent').drawn()).toBeNull();
                await new Sidebar(page).open('components');
                await expect(diagram.palette.checkedCheckboxes).toHaveCount(0);
            });

            test('gives the diagram the focus when the mouse comes back over it', async ({ page }) => {
                await diagram.moveFromCenterTo({ x: 30, y: 20 });

                await expect(page.locator('app-diagram-workspace-presenter')).toBeFocused();
            });

            test('leaves the tab its focus while the mouse stays off the diagram', async ({ page }) => {
                await page.mouse.move(5, 5);

                await expect(page.getByTestId('settingsTab')).toBeFocused();
            });
        });

        test('leaves the focus in a field being typed in when the mouse passes over the diagram', async ({ page }) => {
            const field = await addTextField(page);
            await field.focus();

            await diagram.moveFromCenterTo();
            await diagram.moveFromCenterTo({ x: 40, y: 40 });
            await page.keyboard.type('25');

            await expect(field).toBeFocused();
            await expect(field).toHaveValue('25');
        });

        test('takes the focus from the cell size slider when the mouse comes back over the diagram', async ({ page }) => {
            const settingsPanel = new SettingsPanel(page);
            await diagram.pickPaletteComponent();
            await settingsPanel.openGridSettings();
            await settingsPanel.gridSpacingSlider.focus();

            await diagram.moveFromCenterTo();
            await page.keyboard.press('Escape');
            await settle(page);

            await expect(page.locator('app-diagram-workspace-presenter')).toBeFocused();
            expect(await diagram.layer('activeComponent').drawn()).toBeNull();
            expect(await settingsPanel.gridSpacing()).toBe(DEFAULT_GRID_SPACING);
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
            function middlePressCancelled(target: Locator) {
                return target.evaluate(el => {
                    const event = new MouseEvent('mousedown', { button: 1, bubbles: true, cancelable: true });
                    return !el.dispatchEvent(event);
                });
            }

            expect(await middlePressCancelled(diagram.layer('activeWire').canvas)).toBe(true);
            expect(await middlePressCancelled(page.locator('body'))).toBe(true);

            // a middle press in a field is left alone, for middle-click paste
            expect(await middlePressCancelled(await addTextField(page))).toBe(false);
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
            function sizeOf() {
                return diagram.canvases.evaluateAll((cs: HTMLCanvasElement[]) => cs.map(c => `${c.width}x${c.height}`));
            }
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

    test.describe('zooming', () => {
        /** How far apart the grid lines are on the screen: the size of a cell. The grid has to be in lines mode. */
        async function cellSize(): Promise<number> {
            const { region, columns } = await diagram.layer('grid').profile();
            const xs = runs(columns, region.left, count => count > region.height / 2).map(run => run.end);
            return xs.length > 1 ? xs[1] - xs[0] : 0;
        }

        /** Scrolls with the mouse wheel where the pointer is, as one 100px notch per step. Up is negative. */
        async function scroll(notches: number) {
            for (let i = 0; i < Math.abs(notches); i++) await diagram.page.mouse.wheel(0, Math.sign(notches) * 100);
            await settle(diagram.page);
        }

        /** The cell size after zooming from the default by some 100px notches, with the default zoom settings. */
        function cellsAfter(notches: number) {
            return Math.round(DEFAULT_GRID_SPACING * Math.min(5, Math.max(0.25, Math.exp(-0.15 * notches))));
        }

        test.beforeEach(async ({ page }) => {
            const settings = new SettingsPanel(page);
            await settings.openGridSettings();
            await settings.setGridMode('lines');
            await expect.poll(cellSize).toBe(DEFAULT_GRID_SPACING);
        });

        test('zooms in scrolling up over the diagram, and back out scrolling down', async () => {
            await diagram.moveFromCenterTo();

            await scroll(-2);
            await expect.poll(cellSize).toBe(cellsAfter(-2));
            expect(cellsAfter(-2)).toBeGreaterThan(DEFAULT_GRID_SPACING);

            await scroll(2);
            await expect.poll(cellSize).toBe(DEFAULT_GRID_SPACING);
        });

        test('keeps the point under the pointer where it is', async () => {
            await diagram.place();
            const components = diagram.layer('component');
            await expect.poll(async () => (await components.drawn())?.count ?? 0).toBeGreaterThan(0);
            const before = (await components.drawn())!;
            // a point inside the gate, off its middle, so the gate grows unevenly around it
            const pointer = { x: before.left + 17, y: before.top + 23 };
            await diagram.page.mouse.move(pointer.x, pointer.y);
            await settle(diagram.page);

            await scroll(-3);

            await expect.poll(cellSize).toBe(cellsAfter(-3));
            const after = (await components.drawn())!;
            // the gate is 6 cells across, so its width says how much it grew
            const growth = (after.right - after.left + 1) / (before.right - before.left + 1);
            expect(growth).toBeCloseTo(cellsAfter(-3) / DEFAULT_GRID_SPACING, 1);
            expect(Math.abs(after.left - (pointer.x - (pointer.x - before.left) * growth))).toBeLessThanOrEqual(1.5);
            expect(Math.abs(after.top - (pointer.y - (pointer.y - before.top) * growth))).toBeLessThanOrEqual(1.5);
        });

        test('stops at the zoom limits', async () => {
            await diagram.moveFromCenterTo();

            await scroll(20);
            await expect.poll(cellSize).toBe(cellsAfter(20)); // 0.25 x 20px
            expect(cellsAfter(20)).toBe(5);

            await scroll(-40);
            await expect.poll(cellSize).toBe(cellsAfter(-40)); // 5 x 20px
            expect(cellsAfter(-40)).toBe(100);
        });

        test('keeps the ghost under the pointer', async () => {
            await diagram.pickPaletteComponent('AndGate');
            const pointer = await diagram.moveFromCenterTo({ x: 23, y: -11 });

            await scroll(-3);

            await expect.poll(cellSize).toBe(cellsAfter(-3));
            expect(await diagram.layer('activeComponent').drawnCenter()).toBeCenteredOn(pointer, cellsAfter(-3));
        });

        test.describe('settings', () => {
            let settings: SettingsPanel;

            test.beforeEach(async ({ page }) => {
                settings = new SettingsPanel(page);
                await settings.openZoomSettings();
            });

            test('shows the default zoom settings', async () => {
                expect(await settings.zoomSetting('zoomScrollRate')).toBe(0.0015);
                expect(await settings.zoomSetting('zoomPinchRate')).toBe(0.01);
                expect(await settings.zoomSetting('zoomMin')).toBe(0.25);
                expect(await settings.zoomSetting('zoomMax')).toBe(5);
            });

            test('does not invert scrolling to start with', async () => {
                await expect(settings.page.locator('#zoomInvertScroll')).not.toBeChecked();
            });

            test('zooms out scrolling up, and in scrolling down, when scrolling is inverted', async () => {
                await settings.setInvertScroll(true);
                await diagram.moveFromCenterTo();

                await scroll(-2);
                await expect.poll(cellSize).toBe(cellsAfter(2));
                expect(cellsAfter(2)).toBeLessThan(DEFAULT_GRID_SPACING);

                await scroll(4);
                await expect.poll(cellSize).toBe(cellsAfter(-2));
            });

            test('zooms the usual way again once scrolling is no longer inverted', async () => {
                await settings.setInvertScroll(true);
                await settings.setInvertScroll(false);
                await diagram.moveFromCenterTo();

                await scroll(-2);

                await expect.poll(cellSize).toBe(cellsAfter(-2));
            });

            test('zooms at the scroll speed set in the settings', async () => {
                await settings.setZoomSetting('zoomScrollRate', 0.003);
                await diagram.moveFromCenterTo();

                await scroll(-1);

                // one 100px notch at 0.003 is e^0.3: 1.35x, twice the default's 0.15 in steps
                await expect.poll(cellSize).toBe(Math.round(DEFAULT_GRID_SPACING * Math.exp(0.3)));
            });

            test('stops at the zoom limits set in the settings', async () => {
                await settings.setZoomSetting('zoomMax', 1.5);
                await settings.setZoomSetting('zoomMin', 0.5);
                await diagram.moveFromCenterTo();

                await scroll(-10);
                await expect.poll(cellSize).toBe(1.5 * DEFAULT_GRID_SPACING);

                await scroll(20);
                await expect.poll(cellSize).toBe(0.5 * DEFAULT_GRID_SPACING);
            });

            test('sets the scroll speed by dragging its slider: all the way right is the fastest', async ({ page }) => {
                const handle = settings.zoomSlider('zoomScrollRate');
                const track = (await page.getByTestId('zoomScrollRate').boundingBox())!;
                const start = (await handle.boundingBox())!;
                await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
                await page.mouse.down();
                await page.mouse.move(track.x + track.width + 50, start.y + start.height / 2, { steps: 5 });
                await page.mouse.up();
                expect(await settings.zoomSetting('zoomScrollRate')).toBe(0.005);
                await diagram.moveFromCenterTo();

                await scroll(-1);

                // one 100px notch at 0.005 is e^0.5: 1.65x
                await expect.poll(cellSize).toBe(Math.round(DEFAULT_GRID_SPACING * Math.exp(0.5)));
            });

            test('shows each setting beside its label', async ({ page }) => {
                await settings.setZoomSetting('zoomMax', 2.5);

                await expect(page.getByTestId('zoomScrollRateValue')).toHaveText('0.0015');
                await expect(page.getByTestId('zoomPinchRateValue')).toHaveText('0.010');
                await expect(page.getByTestId('zoomMinValue')).toHaveText('0.25x');
                await expect(page.getByTestId('zoomMaxValue')).toHaveText('2.5x');
            });

            test('has sliders, not text fields', async ({ page }) => {
                const zoomSettings = page.getByTestId('zoomSettings');

                await expect(zoomSettings.getByRole('slider')).toHaveCount(4);
                await expect(zoomSettings.locator('input:not([type="checkbox"])')).toHaveCount(0);
            });
        });

        test('leaves scrolling the left panel alone: it scrolls, and the diagram does not zoom', async ({ page }) => {
            const palette = new ComponentPalette(page);
            await palette.sidebar.open('components');
            for (const category of CATEGORIES) await palette.expand(category);
            // the palette's top splitter panel is what scrolls
            const scroller = palette.root.locator('.p-splitterpanel').first();
            // make sure there is something to scroll
            await page.setViewportSize({ width: 1280, height: 420 });
            await expect.poll(() => scroller.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
            const prevented = await page.evaluateHandle(() => {
                const seen: boolean[] = [];
                window.addEventListener('wheel', event => seen.push(event.defaultPrevented));
                return seen;
            });

            const box = (await scroller.boundingBox())!;
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await scroll(2);

            await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
            expect(await prevented.evaluate(seen => seen)).toEqual([false, false]);
            expect(await cellSize()).toBe(DEFAULT_GRID_SPACING);
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
