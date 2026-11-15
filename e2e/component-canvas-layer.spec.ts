import type { CanvasLayer, Profile, Region } from './support/canvas-layer';
import { runs, shifted } from './support/canvas-layer';
import { DiagramWorkspace } from './support/diagram-workspace';
import type { Size } from './support/draw-helpers';
import { settle } from './support/draw-helpers';
import { expect } from './support/draw-matchers';
import { SettingsPanel } from './support/settings-panel';
import { test } from './support/test';

/** The layer strokes components with lines this many pixels wide. */
const LINE_WIDTH = 2;
/** An AndGate's footprint: its body and pins, without the width of its lines. */
const AND_GATE: Size = { width: 120, height: 80 };

/**
 * The component canvas layer draws the components that were placed in the diagram, in solid black lines. It adds a
 * new component without touching the ones already drawn, moves them with the diagram when it is panned, and draws
 * them again when its canvas changes.
 *
 * Only AndGate has a draw() so far, so the tests place AndGates.
 */
test.describe('Component canvas layer', () => {
    let diagram: DiagramWorkspace;
    let layer: CanvasLayer;

    test.beforeEach(async ({ page }) => {
        diagram = new DiagramWorkspace(page);
        layer = diagram.layer('component');
        await diagram.load();
    });

    /** Places a component and returns the region around it. Other components have to be out of that region. */
    const placeAt = async (offset = { x: 0, y: 0 }): Promise<Region> => {
        const before = (await layer.drawn())?.count ?? 0;
        await diagram.place(offset);
        await expect.poll(async () => (await layer.drawn())?.count ?? 0).toBeGreaterThan(before);
        const center = await diagram.atCenter(offset);
        // the component is centered on the pointer, give or take the snap to the grid
        return {
            left: center.x - AND_GATE.width / 2 - 20,
            top: center.y - AND_GATE.height / 2 - 20,
            width: AND_GATE.width + 40,
            height: AND_GATE.height + 40,
        };
    };

    /**
     * Checks that two regions hold the same drawing: the same number of drawn pixels in every column and row, give or
     * take a pixel. Components are stroked together, and the antialiasing of one can differ by a faint pixel
     * depending on what else is stroked with it.
     */
    const expectSameDrawing = (actual: Profile, expected: Profile) => {
        const differences = (a: number[], b: number[]) => a.map((count, i) => Math.abs(count - b[i]));
        expect(actual.columns.length).toBe(expected.columns.length);
        expect(actual.rows.length).toBe(expected.rows.length);
        expect(Math.max(...differences(actual.columns, expected.columns))).toBeLessThanOrEqual(1);
        expect(Math.max(...differences(actual.rows, expected.rows))).toBeLessThanOrEqual(1);
    };

    test.describe('drawing', () => {
        test('draws nothing until a component is placed', async () => {
            await settle(diagram.page);
            expect(await layer.drawn()).toBeNull();

            // a ghost is not a placed component
            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();

            expect(await layer.drawn()).toBeNull();
        });

        test('draws a placed component in solid black', async () => {
            await placeAt();

            const colors = await layer.colors();
            const total = colors.reduce((sum, color) => sum + color.count, 0);
            expect(colors).toMatchColor({ r: 0, g: 0, b: 0, a: 255 });
            // the straight lines are fully opaque; the rest is the antialiased edge of the curve
            expect(colors[0].count / total).toBeGreaterThan(0.5);
        });

        test('draws a placed component at its full size', async () => {
            await placeAt();

            const drawn = (await layer.drawn())!;
            // the pins end on the footprint's sides; the body's top and bottom lines are centered on them
            expect(drawn.right - drawn.left + 1).toBe(AND_GATE.width);
            expect(drawn.bottom - drawn.top + 1).toBe(AND_GATE.height + LINE_WIDTH);
        });

        test('draws a component\'s lines two pixels wide', async () => {
            const region = await placeAt();

            const { columns, rows } = await layer.profile(region);
            // the body's straight left side is the only thing that fills most of a column,
            // and its top and bottom the only things that fill a good part of a row
            const sides = runs(columns, region.left, count => count > AND_GATE.height / 2);
            const edges = runs(rows, region.top, count => count > AND_GATE.width / 4);

            expect(sides.map(run => run.length)).toEqual([LINE_WIDTH]);
            expect(edges.map(run => run.length)).toEqual([LINE_WIDTH, LINE_WIDTH]);
        });

        test('draws every component the same', async () => {
            const first = await placeAt({ x: -200, y: -100 });
            const single = (await layer.drawn())!.count;

            // whole cells apart, so they are the same drawing somewhere else
            await placeAt({ x: 0, y: 60 });
            await placeAt({ x: 200, y: -40 });

            const expected = await layer.profile(first);
            expectSameDrawing(await layer.profile(shifted(first, 200, 160)), expected);
            expectSameDrawing(await layer.profile(shifted(first, 400, 60)), expected);
            // three times the pixels of one, give or take a few faint ones
            expect(Math.abs((await layer.drawn())!.count - single * 3)).toBeLessThanOrEqual(6);
        });

        test('keeps the components that are drawn as they were when another is placed', async () => {
            const first = await placeAt({ x: -200, y: 0 });
            const before = await layer.profile(first);

            await placeAt({ x: 100, y: 0 });
            expectSameDrawing(await layer.profile(first), before);

            await placeAt({ x: 100, y: 150 });
            expectSameDrawing(await layer.profile(first), before);
        });

        // not sure how i feel about this behavior - test is correct for current behavior.
        test('draws components that overlap', async () => {
            await placeAt();
            const one = (await layer.drawn())!;

            await diagram.place({ x: 40, y: 20 });

            await expect.poll(async () => (await layer.drawn())!.count).toBeGreaterThan(one.count);
            const both = (await layer.drawn())!;
            expect(both.left).toBe(one.left);
            expect(both.top).toBe(one.top);
            expect(both.right).toBe(one.right + 40);
            expect(both.bottom).toBe(one.bottom + 20);
        });
    });

    test.describe('with the other layers', () => {
        test('is not changed by a ghost moving over a placed component', async ({ page }) => {
            const region = await placeAt();
            const fingerprint = await layer.fingerprint(region);

            await diagram.pickPaletteComponent();
            for (const offset of [{ x: -60, y: 0 }, { x: 0, y: 0 }, { x: 20, y: 40 }]) {
                await diagram.moveFromCenterTo(offset);
                expect(await layer.fingerprint(region)).toBe(fingerprint);
            }

            await page.keyboard.press('Escape');
            await settle(page);
            expect(await layer.fingerprint(region)).toBe(fingerprint);
        });

        test('is not changed by the grid settings', async () => {
            const settings = new SettingsPanel(diagram.page);
            const region = await placeAt();
            const fingerprint = await layer.fingerprint(region);

            await settings.openGridSettings();
            await settings.setGridMode('lines');
            expect(await layer.fingerprint(region)).toBe(fingerprint);

            await settings.setGridSpacing(50);
            expect(await layer.fingerprint(region)).toBe(fingerprint);
        });
    });

    test.describe('panning', () => {
        for (const by of [{ x: 60, y: 40 }, { x: -73, y: 41 }, { x: 137, y: 91 }, { x: -150, y: -110 }]) {
            test(`moves the components with the diagram, unchanged, when it is dragged by ${by.x}, ${by.y}`, async () => {
                const region = await placeAt();
                const fingerprint = await layer.fingerprint(region);
                const count = (await layer.drawn())!.count;

                await diagram.pan({ x: 200, y: 150 }, by);

                expect(await layer.fingerprint(shifted(region, by.x, by.y))).toBe(fingerprint);
                expect((await layer.drawn())!.count).toBe(count);
            });
        }

        test('moves the components while the diagram is being dragged, before it is released', async () => {
            const region = await placeAt();
            const fingerprint = await layer.fingerprint(region);

            await diagram.pan({ x: 200, y: 150 }, { x: 80, y: -30 }, { release: false });
            expect(await layer.fingerprint(shifted(region, 80, -30))).toBe(fingerprint);

            await diagram.releasePan();
        });

        test('draws a component again after it was dragged out of view and back', async () => {
            const region = await placeAt();
            const fingerprint = await layer.fingerprint(region);
            const visible = await layer.visibleRegion();

            // far enough to the left that it leaves the workspace
            const steps = Math.ceil((visible.width / 2 + AND_GATE.width) / 300);
            for (let i = 0; i < steps; i++) await diagram.pan({ x: 150, y: 150 }, { x: -300, y: 0 });
            const { columns } = await layer.profile();
            expect(columns.every(count => count === 0)).toBe(true);

            for (let i = 0; i < steps; i++) await diagram.pan({ x: -150, y: 150 }, { x: 300, y: 0 });

            expect(await layer.fingerprint(region)).toBe(fingerprint);
        });

        test('keeps every component in place, relative to the others, while panning', async () => {
            await placeAt({ x: -200, y: -100 });
            await placeAt({ x: 150, y: 80 });
            const before = (await layer.drawn())!;

            for (const by of [{ x: 91, y: 0 }, { x: 0, y: -67 }, { x: -140, y: 120 }]) {
                await diagram.pan({ x: 0, y: 200 }, by);
            }

            const after = (await layer.drawn())!;
            expect(after.right - after.left).toBe(before.right - before.left);
            expect(after.bottom - after.top).toBe(before.bottom - before.top);
            expect(after.left - before.left).toBe(91 - 140);
            expect(after.top - before.top).toBe(-67 + 120);
            expect(after.count).toBe(before.count);
        });
    });

    test.describe('resizing', () => {
        test('keeps the components where they were, unchanged, when the window grows', async () => {
            const region = await placeAt();
            const fingerprint = await layer.fingerprint(region);

            await diagram.growWindow();

            expect(await layer.fingerprint(region)).toBe(fingerprint);
        });

        test('draws a component in the part of the workspace that the window uncovered', async () => {
            const before = await layer.visibleRegion();
            await diagram.growWindow();

            // near the new bottom right corner, beyond where the workspace ended
            const visible = await layer.visibleRegion();
            await placeAt({ x: visible.width / 2 - 100, y: visible.height / 2 - 80 });

            const drawn = (await layer.drawn())!;
            expect(drawn.right).toBeGreaterThan(before.left + before.width);
            expect(drawn.bottom).toBeGreaterThan(before.top + before.height);
            expect(drawn.right - drawn.left + 1).toBe(AND_GATE.width);
        });
    });
});
