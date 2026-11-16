import type { CanvasLayer, Region, Run } from './support/canvas-layer';
import { runs } from './support/canvas-layer';
import { DEFAULT_GRID_SPACING, DiagramWorkspace } from './support/diagram-workspace';
import { expect } from './support/draw-matchers';
import { SettingsPanel } from './support/settings-panel';
import { test } from './support/test';

type GridMode = 'dots' | 'lines';

/** A dot is this many pixels across and down. */
const DOT_SIZE = 2;
/** A line is this many pixels wide. */
const LINE_WIDTH = 1;
/** The grid's color: CSS lightgray, fully opaque. */
const LIGHT_GRAY = { r: 211, g: 211, b: 211, a: 255 };
/**
 * How opaque a pixel has to be to count as part of a grid mark: about 3%. Dot and line widths are fractions of a
 * cell in diagram units, and rounding in the canvas can leave an invisible 1/255 fringe beside them.
 */
const VISIBLE_ALPHA = 8;

/** Where the grid's columns and rows are in a region, as runs of pixels and as the grid position of each. */
interface GridMarks {
    region: Region;
    columns: Run[];
    rows: Run[];
    /** The x of every grid column, in client coordinates. */
    x: number[];
    /** The y of every grid row, in client coordinates. */
    y: number[];
}

/**
 * The grid canvas layer draws the diagram's grid: dots or lines, one cell apart, in light gray, over the whole
 * workspace. It follows the grid settings, moves with the diagram when it is panned, and is redrawn to cover the
 * workspace when the canvas grows.
 *
 * A grid position is where a line is drawn. A dot is two pixels across, ending on its grid position.
 */
test.describe('Grid canvas layer', () => {
    let diagram: DiagramWorkspace;
    let settings: SettingsPanel;
    let grid: CanvasLayer;

    test.beforeEach(async ({ page }) => {
        diagram = new DiagramWorkspace(page);
        settings = new SettingsPanel(page);
        grid = diagram.layer('grid');
        await diagram.load();
        await expect.poll(() => grid.drawn()).not.toBeNull();
    });

    /** Reads where the grid's columns and rows are in the part of the layer that is shown. */
    async function readMarks(mode: GridMode): Promise<GridMarks> {
        const { region, columns, rows } = await grid.profile(undefined, VISIBLE_ALPHA);
        // in lines mode every column has the pixels of the lines across it, so a line is a column that is mostly drawn
        const isColumn = mode === 'lines' ? (count: number) => count > region.height / 2 : undefined;
        const isRow = mode === 'lines' ? (count: number) => count > region.width / 2 : undefined;
        const size = mode === 'lines' ? LINE_WIDTH : DOT_SIZE;
        // a dot cut off by the far edge of the region ends before its grid position: leave it out
        function whole(last: number) {
            return (run: Run) => !(run.end === last && run.length < size);
        }
        const columnRuns = runs(columns, region.left, isColumn).filter(whole(region.left + region.width - 1));
        const rowRuns = runs(rows, region.top, isRow).filter(whole(region.top + region.height - 1));
        return { region, columns: columnRuns, rows: rowRuns, x: columnRuns.map(r => r.end), y: rowRuns.map(r => r.end) };
    }

    /** Checks that positions are evenly spaced, with no gap, from one edge to the other. */
    function expectEvenlySpacedAcross(positions: number[], spacing: number, first: number, last: number) {
        expect(positions.length).toBeGreaterThan(1);
        const gaps = positions.slice(1).map((position, i) => position - positions[i]);
        expect(new Set(gaps)).toEqual(new Set([spacing]));
        expect(positions[0] - first).toBeLessThan(spacing);
        expect(last - positions.at(-1)!).toBeLessThan(spacing);
    }

    /** Checks that the grid is one cell apart both ways and reaches every edge of the part that is shown. */
    function expectCoversWorkspace(marks: GridMarks, spacing: number) {
        const { region } = marks;
        expectEvenlySpacedAcross(marks.x, spacing, region.left, region.left + region.width - 1);
        expectEvenlySpacedAcross(marks.y, spacing, region.top, region.top + region.height - 1);
    }

    /** Sets the grid's display mode in the settings and waits for the layer to draw it. */
    async function setMode(mode: GridMode) {
        await settings.openGridSettings();
        await settings.setGridMode(mode);
        await expect.poll(async () => (await readMarks(mode)).x.length).toBeGreaterThan(1);
    }

    /** Sets the grid's cell size in the settings and waits for the layer to draw it. */
    async function setSpacing(spacing: number, mode: GridMode = 'dots') {
        await settings.openGridSettings();
        await settings.setGridSpacing(spacing);
        await expect.poll(async () => {
            const marks = await readMarks(mode);
            return marks.x[1] - marks.x[0];
        }).toBe(spacing);
    }

    test.describe('dots', () => {
        test('draws the grid as dots by default, in opaque light gray', async () => {
            const colors = await grid.colors();

            expect(colors).toMatchColor(LIGHT_GRAY);
            // expect(colors).toEqual([{ ...LIGHT_GRAY, count: expect.any(Number) }]);
        });

        test('draws every dot two pixels across and down', async () => {
            const marks = await readMarks('dots');
            // a dot on the near edge of the canvas is cut off, so the first of each is left out
            const sizes = [...marks.columns.slice(1), ...marks.rows.slice(1)].map(run => run.length);

            expect(new Set(sizes)).toEqual(new Set([DOT_SIZE]));
        });

        test('spaces the dots one cell apart, across and down, over the whole workspace', async () => {
            expectCoversWorkspace(await readMarks('dots'), DEFAULT_GRID_SPACING);
        });

        test('draws a dot at every crossing of a grid column and a grid row', async () => {
            const { region, columns, rows } = await grid.profile();
            const marks = await readMarks('dots');

            // every dot column holds a dot for every row, and the other way around
            for (const run of marks.columns.slice(1)) {
                for (let x = run.start; x <= run.end; x++) expect(columns[x - region.left]).toBe(rows.filter(c => c > 0).length);
            }
            for (const run of marks.rows.slice(1)) {
                for (let y = run.start; y <= run.end; y++) expect(rows[y - region.top]).toBe(columns.filter(c => c > 0).length);
            }
        });
    });

    test.describe('lines', () => {
        test.beforeEach(async () => {
            await setMode('lines');
        });

        test('draws the grid as lines in light gray', async () => {
            const colors = await grid.colors();
            const total = colors.reduce((sum, color) => sum + color.count, 0);

            expect(colors[0].color).toMatchObject(LIGHT_GRAY);
            // all but a few pixels on the canvas edges are the opaque color
            expect(colors[0].count / total).toBeGreaterThan(0.99);
            expect(colors).toMatchColor(LIGHT_GRAY);
        });

        test('draws every line one pixel wide', async () => {
            const marks = await readMarks('lines');
            const widths = [...marks.columns, ...marks.rows].map(run => run.length);

            expect(new Set(widths)).toEqual(new Set([LINE_WIDTH]));
        });

        test('draws every line from one edge of the workspace to the other', async () => {
            const { region, columns, rows } = await grid.profile();
            const marks = await readMarks('lines');

            for (const x of marks.x) expect(columns[x - region.left]).toBe(region.height);
            for (const y of marks.y) expect(rows[y - region.top]).toBe(region.width);
        });

        test('spaces the lines one cell apart, across and down, over the whole workspace', async () => {
            expectCoversWorkspace(await readMarks('lines'), DEFAULT_GRID_SPACING);
        });

        test('draws the lines where the dots were', async () => {
            const lines = await readMarks('lines');

            await setMode('dots');
            const dots = await readMarks('dots');

            expect(dots.x).toEqual(lines.x);
            expect(dots.y).toEqual(lines.y);
        });
    });

    test.describe('display mode', () => {
        test('draws the same dots again after switching to lines and back', async () => {
            const before = await grid.fingerprint();

            await setMode('lines');
            await expect.poll(() => grid.fingerprint()).not.toBe(before);
            await settings.setGridMode('dots');

            await expect.poll(() => grid.fingerprint()).toBe(before);
        });
    });

    test.describe('cell size', () => {
        for (const mode of ['dots', 'lines'] as const) {
            for (const spacing of [10, 25, 50]) {
                test(`spaces the ${mode} ${spacing}px apart over the whole workspace`, async () => {
                    if (mode === 'lines') await setMode('lines');

                    await setSpacing(spacing, mode);

                    expectCoversWorkspace(await readMarks(mode), spacing);
                });
            }

            test(`keeps the ${mode} grid on the top left corner of a new diagram at any cell size`, async () => {
                if (mode === 'lines') await setMode('lines');

                for (const spacing of [DEFAULT_GRID_SPACING, 10, 25, 50]) {
                    await setSpacing(spacing, mode);

                    const marks = await readMarks(mode);
                    expect(marks.x[0]).toBe(marks.region.left);
                    expect(marks.y[0]).toBe(marks.region.top);
                }
            });
        }

        test('keeps the size of the dots and the width of the lines at any cell size', async () => {
            for (const spacing of [10, 50]) {
                await setMode('dots');
                await setSpacing(spacing, 'dots');
                const dots = await readMarks('dots');
                expect(new Set(dots.columns.slice(1).map(run => run.length))).toEqual(new Set([DOT_SIZE]));

                await setMode('lines');
                const lines = await readMarks('lines');
                expect(new Set(lines.columns.map(run => run.length))).toEqual(new Set([LINE_WIDTH]));
            }
        });
    });

    test.describe('panning', () => {
        /** Drags that bring each edge of the canvas, and a corner, into view. */
        const drags = [
            { name: 'right', by: { x: 150, y: 0 } },
            { name: 'left', by: { x: -150, y: 0 } },
            { name: 'down', by: { x: 0, y: 130 } },
            { name: 'up', by: { x: 0, y: -130 } },
            { name: 'right and down, by part of a cell', by: { x: 47, y: 33 } },
            { name: 'left and up, by part of a cell', by: { x: -91, y: -58 } },
        ];

        for (const mode of ['dots', 'lines'] as const) {
            for (const { name, by } of drags) {
                test(`moves the ${mode} with the diagram and still covers the workspace when it is dragged ${name}`, async () => {
                    if (mode === 'lines') await setMode('lines');
                    const before = await readMarks(mode);

                    await diagram.pan({ x: 0, y: 0 }, by);

                    const after = await readMarks(mode);
                    // the grid moved by the drag: a grid position is a whole number of cells from where one went
                    expect(Math.abs((after.x[0] - before.x[0] - by.x) % DEFAULT_GRID_SPACING)).toBe(0);
                    expect(Math.abs((after.y[0] - before.y[0] - by.y) % DEFAULT_GRID_SPACING)).toBe(0);
                    expectCoversWorkspace(after, DEFAULT_GRID_SPACING);
                });
            }
        }

        test('keeps covering the workspace over several drags', async () => {
            // the canvases grow with every edge that comes into view, which slows the page down
            test.slow();
            for (const { by } of drags) {
                await diagram.pan({ x: 0, y: 0 }, by);

                expectCoversWorkspace(await readMarks('dots'), DEFAULT_GRID_SPACING);
            }
        });

        test('draws the same grid again when the diagram is dragged back', async () => {
            const before = await grid.fingerprint();

            await diagram.pan({ x: 0, y: 0 }, { x: 47, y: 33 });
            expect(await grid.fingerprint()).not.toBe(before);
            await diagram.pan({ x: 0, y: 0 }, { x: -47, y: -33 });

            expect(await grid.fingerprint()).toBe(before);
        });
    });

    test.describe('resizing', () => {
        for (const mode of ['dots', 'lines'] as const) {
            test(`covers the workspace with ${mode} after the window grows`, async () => {
                if (mode === 'lines') await setMode('lines');
                const before = await grid.visibleRegion();

                await diagram.growWindow();

                const marks = await readMarks(mode);
                expect(marks.region.width).toBeGreaterThan(before.width);
                expect(marks.region.height).toBeGreaterThan(before.height);
                expectCoversWorkspace(marks, DEFAULT_GRID_SPACING);
            });
        }

        test('keeps the grid where it was when the window grows', async () => {
            const before = await grid.visibleRegion();
            const fingerprint = await grid.fingerprint(before);

            await diagram.growWindow();

            expect(await grid.fingerprint(before)).toBe(fingerprint);
        });
    });

    test.describe('with components', () => {
        test('is not changed by a ghost or a placed component', async () => {
            const before = await grid.fingerprint();

            await diagram.pickPaletteComponent();
            await diagram.moveFromCenterTo();
            expect(await grid.fingerprint()).toBe(before);

            await diagram.clickFromCenterAt();
            expect(await grid.fingerprint()).toBe(before);
        });

        test('draws its lines where components are placed, also after the canvas grew', async () => {
            const component = diagram.layer('component');
            await setMode('lines');

            await diagram.place();
            const first = (await component.drawn())!;
            let marks = await readMarks('lines');
            // the left end of the component's input pins is on a grid column
            expect(marks.x).toContain(first.left);

            // dragging right and down brings the canvas's left and top edges into view, so it grows that way
            await diagram.pan({ x: 200, y: 150 }, { x: 137, y: 91 });
            marks = await readMarks('lines');
            const moved = (await component.drawn())!;
            expect(moved.left).toBe(first.left + 137);
            expect(marks.x).toContain(moved.left);
        });
    });
});
