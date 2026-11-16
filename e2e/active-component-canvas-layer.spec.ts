import type { CanvasLayer, Color, Region } from './support/canvas-layer';
import { runs, shifted } from './support/canvas-layer';
import { DEFAULT_GRID_SPACING, DiagramWorkspace } from './support/diagram-workspace';
import type { Size } from './support/draw-helpers';
import { Point, settle } from './support/draw-helpers';
import { expect } from './support/draw-matchers';
import { test } from './support/test';

/** An AndGate's footprint: its body and pins, without the width of its lines. */
const AND_GATE: Size = { width: 120, height: 80 }; // eventually this will be computed from a gate instance
/** The component layer strokes placed components with lines this many pixels wide. This layer's are bolder. */
const PLACED_LINE_WIDTH = 2;
/** The ghost's color: CSS gray at half opacity. */
const GHOST_GRAY: Color = { r: 128, g: 128, b: 128, a: 128 };

/**
 * The active component canvas layer draws the component that is being worked with. For now that is the ghost: the
 * picked palette component following the mouse before it is placed, drawn in translucent gray with bold lines. The
 * layer holds one ghost at a time, clears it for good when it is removed, and moves it with the diagram.
 *
 * Only AndGate has a draw() so far, so the ghost is an AndGate.
 */
test.describe('Active component canvas layer', () => {
    let diagram: DiagramWorkspace;
    let layer: CanvasLayer;

    test.beforeEach(async ({ page }) => {
        diagram = new DiagramWorkspace(page);
        layer = diagram.layer('activeComponent');
        await diagram.load();
    });

    /** The region around a component centered on a point relative to the middle of the workspace. */
    // this will eventually change or be completely deprecated once placeables are completely implemented
    async function regionAt(offset: Point): Promise<Region> {
        const center = await diagram.atCenter(offset);
        // give or take the snap to the grid
        return {
            left: center.x - AND_GATE.width / 2 - DEFAULT_GRID_SPACING,
            top: center.y - AND_GATE.height / 2 - DEFAULT_GRID_SPACING,
            width: AND_GATE.width + DEFAULT_GRID_SPACING * 2,
            height: AND_GATE.height + DEFAULT_GRID_SPACING * 2,
        };
    }

    /** Picks a component and moves the mouse over the diagram, so its ghost is drawn. Returns the region around it. */
    async function showGhost(offset: Point = { x: 0, y: 0 }): Promise<Region> {
        await diagram.pickPaletteComponent();
        await diagram.moveFromCenterTo({ x: offset.x - 30, y: offset.y - 30 });
        await diagram.moveFromCenterTo(offset);
        await expect.poll(() => layer.drawn()).not.toBeNull();
        return regionAt(offset);
    }

    test.describe('drawing', () => {
        test('draws nothing until a picked component is over the diagram', async () => {
            await settle(diagram.page);
            expect(await layer.drawn()).toBeNull();

            // picked, but the mouse is still over the palette
            await diagram.pickPaletteComponent();
            await settle(diagram.page);
            expect(await layer.drawn()).toBeNull();

            await diagram.moveFromCenterTo();
            expect(await layer.drawn()).not.toBeNull();
        });

        test('draws the ghost in translucent gray', async () => {
            await showGhost();

            const colors = await layer.colors();
            // the body of every line is the ghost color at half opacity; the edges of the lines are fainter still
            expect(colors).toMatchColor(GHOST_GRAY);
            expect(Math.abs(colors[0].color.a - GHOST_GRAY.a)).toBeLessThanOrEqual(2);
            for (const { color } of colors) expect(color.a).toBeLessThanOrEqual(GHOST_GRAY.a + 2);
        });

        test('draws the ghost with bolder lines than a placed component', async () => {
            const region = await showGhost();

            const { columns, rows } = await layer.profile(region);
            // the body's straight left side is the only thing that fills most of a column,
            // and its top and bottom the only things that fill a good part of a row
            const sides = runs(columns, region.left, count => count > AND_GATE.height / 2);
            const edges = runs(rows, region.top, count => count > AND_GATE.width / 4);

            expect(sides).toHaveLength(1);
            expect(edges).toHaveLength(2);
            for (const line of [...sides, ...edges]) {
                expect(line.length).toBeGreaterThan(PLACED_LINE_WIDTH);
                expect(line.length).toBeLessThanOrEqual(PLACED_LINE_WIDTH * 2);
            }
        });

        test('draws the ghost at the component\'s full size', async () => {
            await showGhost();

            const drawn = (await layer.drawn())!;
            const height = drawn.bottom - drawn.top + 1;
            // the pins end on the footprint's sides; the body's top and bottom lines are centered on them
            expect(drawn.right - drawn.left + 1).toBe(AND_GATE.width);
            expect(height).toBeGreaterThan(AND_GATE.height + PLACED_LINE_WIDTH);
            expect(height).toBeLessThanOrEqual(AND_GATE.height + PLACED_LINE_WIDTH * 2);
        });

        test('draws one ghost: it leaves nothing behind when it moves', async () => {
            const region = await showGhost();
            const fingerprint = await layer.fingerprint(region);
            const count = (await layer.drawn())!.count;

            // whole cells, so the ghost is the same pixels somewhere else
            for (const cells of [{ x: 1, y: 0 }, { x: 5, y: 3 }, { x: -4, y: 2 }, { x: -6, y: -5 }, { x: 0, y: 0 }]) {
                const by = { x: cells.x * DEFAULT_GRID_SPACING, y: cells.y * DEFAULT_GRID_SPACING };
                await diagram.moveFromCenterTo(by);

                expect(await layer.fingerprint(shifted(region, by.x, by.y))).toBe(fingerprint);
                expect((await layer.drawn())!.count).toBe(count);
            }
        });

        test('draws the same ghost again after the component is placed', async () => {
            const region = await showGhost();
            const fingerprint = await layer.fingerprint(region);
            const count = (await layer.drawn())!.count;

            for (let placed = 0; placed < 3; placed++) {
                await diagram.clickFromCenterAt();

                expect(await layer.fingerprint(region)).toBe(fingerprint);
                expect((await layer.drawn())!.count).toBe(count);
            }
        });

        test('draws the same ghost over a placed component as over the empty diagram', async () => {
            await diagram.place({ x: 200, y: 100 });
            const region = await showGhost();
            const fingerprint = await layer.fingerprint(region);

            await diagram.moveFromCenterTo({ x: 200, y: 100 });

            expect(await layer.fingerprint(shifted(region, 200, 100))).toBe(fingerprint);
        });
    });

    test.describe('clearing', () => {
        /** The ways the ghost is removed. */
        const removals = [
            { name: 'the placement is canceled with Escape', remove: () => diagram.page.keyboard.press('Escape') },
            { name: 'the component is unpicked in the palette', remove: () => diagram.palette.clickTile('AndGate') },
        ];

        for (const { name, remove } of removals) {
            test(`clears the ghost when ${name}`, async () => {
                await showGhost();

                await remove();
                await settle(diagram.page);

                expect(await layer.drawn()).toBeNull();
            });

            test(`does not bring the ghost back when the diagram is dragged after ${name}`, async ({ page }) => {
                await showGhost();
                await remove();
                await settle(page);

                // while it is dragged, and after
                await diagram.pan({ x: 0, y: 0 }, { x: 80, y: 50 }, { release: false });
                expect(await layer.drawn()).toBeNull();
                await diagram.releasePan();
                await diagram.pan({ x: 0, y: 0 }, { x: -200, y: -120 });

                expect(await layer.drawn()).toBeNull();
            });

            test(`does not bring the ghost back when the window grows after ${name}`, async () => {
                await showGhost();
                await remove();
                await settle(diagram.page);

                await diagram.growWindow();

                expect(await layer.drawn()).toBeNull();
            });
        }

        test('clears the ghost after components were placed with it', async ({ page }) => {
            await showGhost();
            await diagram.clickFromCenterAt();
            await diagram.clickFromCenterAt({ x: 160, y: 0 });

            await page.keyboard.press('Escape');
            await settle(page);

            expect(await layer.drawn()).toBeNull();
        });
    });

    test.describe('panning', () => {
        for (const by of [{ x: 80, y: -30 }, { x: -47, y: 33 }, { x: 137, y: 91 }]) {
            test(`moves the ghost with the diagram, unchanged, while it is dragged by ${by.x}, ${by.y}`, async () => {
                const region = await showGhost();
                const fingerprint = await layer.fingerprint(region);
                const before = (await layer.drawn())!;

                /**
                 * Checks the ghost moved by exactly the drag: starting a drag must not move the ghost itself, only
                 * the diagram under it.
                 */
                async function expectMovedWithDiagram() {
                    const drawn = (await layer.drawn())!;
                    expect({ x: drawn.left - before.left, y: drawn.top - before.top }).toEqual(by);
                    expect(await layer.fingerprint(shifted(region, by.x, by.y))).toBe(fingerprint);
                    expect(drawn.count).toBe(before.count);
                }

                await diagram.pan({ x: 0, y: 0 }, by, { release: false });
                await expectMovedWithDiagram();

                await diagram.releasePan();
                await expectMovedWithDiagram();
            });
        }

        test('draws one ghost when the mouse moves on after a drag', async () => {
            await showGhost();
            const count = (await layer.drawn())!.count;
            async function size(): Promise<Size> {
                const drawn = (await layer.drawn())!;
                return { width: drawn.right - drawn.left, height: drawn.bottom - drawn.top };
            }
            const before = await size();

            await diagram.pan({ x: 0, y: 0 }, { x: -47, y: 33 });
            for (const offset of [{ x: 100, y: 60 }, { x: -120, y: -80 }]) {
                await diagram.moveFromCenterTo(offset);

                expect((await layer.drawn())!.count).toBe(count);
                expect(await size()).toEqual(before);
            }
        });
    });

    test.describe('resizing', () => {
        test('keeps the ghost where it was, unchanged, when the window grows', async () => {
            const region = await showGhost();
            const fingerprint = await layer.fingerprint(region);
            const count = (await layer.drawn())!.count;

            await diagram.growWindow();

            expect(await layer.fingerprint(region)).toBe(fingerprint);
            expect((await layer.drawn())!.count).toBe(count);
        });
    });
});
