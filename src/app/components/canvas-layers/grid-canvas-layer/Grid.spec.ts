import { describe, it, expect, vi } from 'vitest';

import type { DrawState } from '../../../models/Drawable';
import type { Point } from '../../../models/Point';
import { diagramToCanvas } from '../../../services/render/view-transform';
import { Grid, GRID_SPACING } from './Grid';

/** The grid scale for a grid spacing setting, in pixels per cell: the setting / GRID_SPACING. */
function scaleFor(spacingSetting: number) {
    return spacingSetting / GRID_SPACING;
}
/** The scale of a diagram with the default 20px cells and no zoom. */
const DEFAULT_SCALE = scaleFor(20);
function at(x: number, y: number, scale = DEFAULT_SCALE): DrawState {
    return { origin: { x, y }, scale, version: 0 };
}
const drawState = at(0, 0);
/** Positions worked out through a fractional scale are only equal to a few decimals. */
function expectClose(actual: number[], expected: number[]) {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i]));
}

/** Just enough of a 2D context for Grid: its size plus the calls it makes. */
function makeContext(width: number, height: number) {
    const ctx = {
        canvas: { width, height },
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        setLineDash: vi.fn(),
        imageSmoothingEnabled: true,
        strokeStyle: '',
        lineWidth: 0,
    };
    return { ctx, asContext: ctx as unknown as OffscreenCanvasRenderingContext2D };
}
type MockContext = ReturnType<typeof makeContext>['ctx'];

/**
 * The grid draws in diagram coordinates and the layer's transform puts them on the canvas. These helpers do the same
 * mapping, so the tests check where the lines land in canvas pixels.
 */
function toCanvas(state: DrawState, [x, y]: number[]): Point {
    return diagramToCanvas(state, { x, y });
}
function segments(ctx: MockContext, state: DrawState) {
    return ctx.moveTo.mock.calls.map((from, i) => ({ from: toCanvas(state, from), to: toCanvas(state, ctx.lineTo.mock.calls[i]) }));
}
function verticalLinesAt(ctx: MockContext, state: DrawState) {
    return segments(ctx, state).filter(s => s.from.x === s.to.x).map(s => s.from.x);
}
function horizontalLinesAt(ctx: MockContext, state: DrawState) {
    return segments(ctx, state).filter(s => s.from.y === s.to.y).map(s => s.from.y);
}
function columnStartsAt(ctx: MockContext, state: DrawState) {
    return ctx.moveTo.mock.calls.map(call => toCanvas(state, call));
}

describe('Grid', () => {
    describe('draw', () => {
        describe('when the canvas has no area', () => {
            it('does not throw and draws nothing when both width and height are zero', () => {
                const { ctx, asContext } = makeContext(0, 0);

                expect(() => new Grid('lines').draw(asContext, drawState)).not.toThrow();
                expect(ctx.moveTo).not.toHaveBeenCalled();
            });

            it('does not throw and draws nothing when only the width is zero', () => {
                const { ctx, asContext } = makeContext(0, 60);

                expect(() => new Grid('lines').draw(asContext, drawState)).not.toThrow();
                expect(ctx.moveTo).not.toHaveBeenCalled();
            });

            it('does not throw and draws nothing when only the height is zero', () => {
                const { ctx, asContext } = makeContext(100, 0);

                expect(() => new Grid('dots').draw(asContext, drawState)).not.toThrow();
                expect(ctx.moveTo).not.toHaveBeenCalled();
            });

            it('draws normally once the canvas has a size again', () => {
                const grid = new Grid('lines');
                const empty = makeContext(0, 0);
                const sized = makeContext(100, 60);

                grid.draw(empty.asContext, drawState);
                grid.draw(sized.asContext, drawState);

                expect(empty.ctx.moveTo).not.toHaveBeenCalled();
                expect(sized.ctx.moveTo).toHaveBeenCalled();
            });
        });

        describe('lines mode', () => {
            it('draws a vertical line per cell across the width and a horizontal line per cell down the height', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid('lines').draw(asContext, drawState);

                expect(verticalLinesAt(ctx, drawState)).toEqual([0.5, 20.5, 40.5, 60.5, 80.5]);
                expect(horizontalLinesAt(ctx, drawState)).toEqual([0.5, 20.5, 40.5]);
            });

            it('draws each line across the whole canvas', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid('lines').draw(asContext, drawState);

                const [vertical] = segments(ctx, drawState);
                expect(vertical.from.y).toBe(0);
                expect(vertical.to.y).toBe(60);
            });

            it('draws fewer lines when the grid scale is larger', () => {
                const { ctx, asContext } = makeContext(100, 60);
                const state = at(0, 0, scaleFor(50));

                new Grid('lines').draw(asContext, state);

                expectClose(verticalLinesAt(ctx, state), [0.5, 50.5]);
                expectClose(horizontalLinesAt(ctx, state), [0.5, 50.5]);
            });

            it('uses 1px lines', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid('lines').draw(asContext, drawState);

                expect(ctx.lineWidth * drawState.scale).toBeCloseTo(1);
            });
        });

        describe('dots mode', () => {
            it('draws dotted vertical lines, one per cell across the width', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid('dots').draw(asContext, drawState);

                const [dash, gap] = ctx.setLineDash.mock.calls[0][0] as number[];
                expect(dash * drawState.scale).toBeCloseTo(2);
                expect(gap * drawState.scale).toBeCloseTo(18);
                expect(columnStartsAt(ctx, drawState).map(p => p.x)).toEqual([0, 20, 40, 60, 80]);
            });
        });

        describe('anchored to the diagram origin', () => {
            it('starts at the first grid line after the canvas edge when the origin is not a multiple of the spacing', () => {
                const { ctx, asContext } = makeContext(100, 100);
                const state = at(500, 500, scaleFor(30)); // cells are 30px on the canvas, and 500 = 16 * 30 + 20

                new Grid('lines').draw(asContext, state);

                expectClose(verticalLinesAt(ctx, state), [20.5, 50.5, 80.5]);
                expectClose(horizontalLinesAt(ctx, state), [20.5, 50.5, 80.5]);
            });

            it('starts at the canvas edge when the origin is a multiple of the spacing', () => {
                const { ctx, asContext } = makeContext(100, 60);
                const state = at(500, 40);

                new Grid('lines').draw(asContext, state);

                expect(verticalLinesAt(ctx, state)).toEqual([0.5, 20.5, 40.5, 60.5, 80.5]);
                expect(horizontalLinesAt(ctx, state)).toEqual([0.5, 20.5, 40.5]);
            });

            it('handles an origin left of or above the canvas', () => {
                const { ctx, asContext } = makeContext(60, 60);
                const state = at(-25, -40); // diagram x = 2 (cells) is at canvas x = 15

                new Grid('lines').draw(asContext, state);

                expect(verticalLinesAt(ctx, state)).toEqual([15.5, 35.5, 55.5]);
                expect(horizontalLinesAt(ctx, state)).toEqual([0.5, 20.5, 40.5]);
            });

            it('draws its lines at multiples of GRID_SPACING in diagram coordinates, whatever the grid scale', () => {
                const { ctx, asContext } = makeContext(100, 100);
                const scale = scaleFor(30);

                new Grid('lines').draw(asContext, at(500, 500, scale));

                // what the grid itself draws, before the layer's transform: x = -16, -15, -14 cells (+ half a pixel)
                const halfPixel = 0.5 / scale;
                const xs = ctx.moveTo.mock.calls
                    .filter(([x], i) => x === ctx.lineTo.mock.calls[i][0])
                    .map(([x]) => x - halfPixel);
                expectClose(xs, [-16, -15, -14]);
                xs.forEach(x => expect(Math.abs(Math.round(x) % GRID_SPACING)).toBe(0));
            });

            it('puts the dots on the anchored grid points', () => {
                const { ctx, asContext } = makeContext(100, 100);
                const state = at(500, 500, scaleFor(30));

                new Grid('dots').draw(asContext, state);

                // one dotted column per grid line, each dash pattern starting on the first grid row (canvas y = 20)
                const starts = columnStartsAt(ctx, state);
                expectClose(starts.map(p => p.x), [20, 50, 80]);
                expectClose(starts.map(p => p.y), [19, 19, 19]);
            });

            it('keeps a component on a grid line after the canvas grows 500px to the left', () => {
                // 30px cells don't divide 500, so a grid drawn from the canvas edge would move under the component
                const scale = scaleFor(30);
                const grid = new Grid('lines');
                const componentX = GRID_SPACING; // diagram position, on a grid line, 30px from the origin on the canvas
                const before = makeContext(600, 60);
                const after = makeContext(1100, 60);
                const beforeState = at(0, 0, scale);
                const afterState = at(500, 0, scale); // what panActiveDiagram does when it grows the canvas left
                function hasLineAt(lines: number[], x: number) {
                    return lines.some(line => Math.abs(line - x) < 1e-9);
                }

                grid.draw(before.asContext, beforeState);
                grid.draw(after.asContext, afterState);

                expect(hasLineAt(verticalLinesAt(before.ctx, beforeState), 0 + componentX * scale + 0.5)).toBe(true);
                expect(hasLineAt(verticalLinesAt(after.ctx, afterState), 500 + componentX * scale + 0.5)).toBe(true);
            });
        });

        describe('zoomed', () => {
            it('spaces the lines by the spacing times the zoom on the canvas', () => {
                const { ctx, asContext } = makeContext(100, 60);
                const state = at(0, 0, 2 * DEFAULT_SCALE); // the canvas shows 2.5 x 1.5 cells of the diagram

                new Grid('lines').draw(asContext, state);

                expect(verticalLinesAt(ctx, state)).toEqual([0.5, 40.5, 80.5]);
                expect(horizontalLinesAt(ctx, state)).toEqual([0.5, 40.5]);
            });

            it('keeps the lines 1px wide on the canvas', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid('lines').draw(asContext, at(0, 0, 2 * DEFAULT_SCALE));

                expect(ctx.lineWidth).toBeCloseTo(1 / 40); // 1 canvas pixel, with 40px cells
            });

            it('keeps the dots 2px on the canvas', () => {
                const { ctx, asContext } = makeContext(100, 60);

                const state = at(0, 0, 2 * DEFAULT_SCALE);

                new Grid('dots').draw(asContext, state);

                // with 40px cells: 2px dots and 38px gaps
                const [dash, gap] = ctx.setLineDash.mock.calls[0][0] as number[];
                expect(ctx.lineWidth * state.scale).toBeCloseTo(2);
                expect(dash * state.scale).toBeCloseTo(2);
                expect(gap * state.scale).toBeCloseTo(38);
            });
        });

        it('draws with the mode it was last given', () => {
            const grid = new Grid('lines');
            grid.gridMode = 'dots';
            const { ctx, asContext } = makeContext(100, 60);

            grid.draw(asContext, drawState);

            // 2px dots and 18px gaps, with 20px cells
            const [dash, gap] = ctx.setLineDash.mock.calls[0][0] as number[];
            expect(dash * drawState.scale).toBeCloseTo(2);
            expect(gap * drawState.scale).toBeCloseTo(18);
        });

        it('draws GRID_SPACING as the spacing setting on the canvas, through the grid scale', () => {
            const state = at(0, 0, scaleFor(50));
            const { ctx, asContext } = makeContext(100, 60);

            new Grid('dots').draw(asContext, state);

            // in diagram units: 2px dots and 48px gaps on the canvas
            const [dash, gap] = ctx.setLineDash.mock.calls[0][0] as number[];
            expect(dash * state.scale).toBeCloseTo(2);
            expect(gap * state.scale).toBeCloseTo(48);
            expectClose(columnStartsAt(ctx, state).map(p => p.x), [0, 50]);
        });
    });
});
