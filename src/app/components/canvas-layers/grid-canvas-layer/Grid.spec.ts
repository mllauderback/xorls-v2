import { describe, it, expect, vi } from 'vitest';

import type { DrawState } from '../../../models/Drawable';
import type { Point } from '../../../models/Point';
import { diagramToCanvas } from '../../../services/render/view-transform';
import { Grid } from './Grid';

const at = (x: number, y: number, scale = 1): DrawState => ({ origin: { x, y }, scale, version: 0 });
const drawState = at(0, 0);

/** Just enough of a 2D context for Grid: its size plus the calls it makes. */
const makeContext = (width: number, height: number) => {
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
};
type MockContext = ReturnType<typeof makeContext>['ctx'];

/**
 * The grid draws in diagram coordinates and the layer's transform puts them on the canvas. These helpers do the same
 * mapping, so the tests check where the lines land in canvas pixels.
 */
const toCanvas = (state: DrawState, [x, y]: number[]): Point => diagramToCanvas(state, { x, y });
const segments = (ctx: MockContext, state: DrawState) =>
    ctx.moveTo.mock.calls.map((from, i) => ({ from: toCanvas(state, from), to: toCanvas(state, ctx.lineTo.mock.calls[i]) }));
const verticalLinesAt = (ctx: MockContext, state: DrawState) =>
    segments(ctx, state).filter(s => s.from.x === s.to.x).map(s => s.from.x);
const horizontalLinesAt = (ctx: MockContext, state: DrawState) =>
    segments(ctx, state).filter(s => s.from.y === s.to.y).map(s => s.from.y);
const columnStartsAt = (ctx: MockContext, state: DrawState) =>
    ctx.moveTo.mock.calls.map(call => toCanvas(state, call));

describe('Grid', () => {
    describe('draw', () => {
        describe('when the canvas has no area', () => {
            it('does not throw and draws nothing when both width and height are zero', () => {
                const { ctx, asContext } = makeContext(0, 0);

                expect(() => new Grid(20, 'lines').draw(asContext, drawState)).not.toThrow();
                expect(ctx.moveTo).not.toHaveBeenCalled();
            });

            it('does not throw and draws nothing when only the width is zero', () => {
                const { ctx, asContext } = makeContext(0, 60);

                expect(() => new Grid(20, 'lines').draw(asContext, drawState)).not.toThrow();
                expect(ctx.moveTo).not.toHaveBeenCalled();
            });

            it('does not throw and draws nothing when only the height is zero', () => {
                const { ctx, asContext } = makeContext(100, 0);

                expect(() => new Grid(20, 'dots').draw(asContext, drawState)).not.toThrow();
                expect(ctx.moveTo).not.toHaveBeenCalled();
            });

            it('draws normally once the canvas has a size again', () => {
                const grid = new Grid(20, 'lines');
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

                new Grid(20, 'lines').draw(asContext, drawState);

                expect(verticalLinesAt(ctx, drawState)).toEqual([0.5, 20.5, 40.5, 60.5, 80.5]);
                expect(horizontalLinesAt(ctx, drawState)).toEqual([0.5, 20.5, 40.5]);
            });

            it('draws each line across the whole canvas', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid(20, 'lines').draw(asContext, drawState);

                const [vertical] = segments(ctx, drawState);
                expect(vertical.from.y).toBe(0);
                expect(vertical.to.y).toBe(60);
            });

            it('draws fewer lines when the spacing is wider', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid(50, 'lines').draw(asContext, drawState);

                expect(verticalLinesAt(ctx, drawState)).toEqual([0.5, 50.5]);
                expect(horizontalLinesAt(ctx, drawState)).toEqual([0.5, 50.5]);
            });

            it('uses 1px lines', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid(20, 'lines').draw(asContext, drawState);

                expect(ctx.lineWidth).toBe(1);
            });
        });

        describe('dots mode', () => {
            it('draws dotted vertical lines, one per cell across the width', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid(20, 'dots').draw(asContext, drawState);

                expect(ctx.setLineDash).toHaveBeenCalledWith([2, 18]);
                expect(columnStartsAt(ctx, drawState).map(p => p.x)).toEqual([0, 20, 40, 60, 80]);
            });
        });

        describe('anchored to the diagram origin', () => {
            it('starts at the first grid line after the canvas edge when the origin is not a multiple of the spacing', () => {
                const { ctx, asContext } = makeContext(100, 100);
                const state = at(500, 500); // 500 = 16 * 30 + 20

                new Grid(30, 'lines').draw(asContext, state);

                expect(verticalLinesAt(ctx, state)).toEqual([20.5, 50.5, 80.5]);
                expect(horizontalLinesAt(ctx, state)).toEqual([20.5, 50.5, 80.5]);
            });

            it('starts at the canvas edge when the origin is a multiple of the spacing', () => {
                const { ctx, asContext } = makeContext(100, 60);
                const state = at(500, 40);

                new Grid(20, 'lines').draw(asContext, state);

                expect(verticalLinesAt(ctx, state)).toEqual([0.5, 20.5, 40.5, 60.5, 80.5]);
                expect(horizontalLinesAt(ctx, state)).toEqual([0.5, 20.5, 40.5]);
            });

            it('handles an origin left of or above the canvas', () => {
                const { ctx, asContext } = makeContext(60, 60);
                const state = at(-25, -40); // diagram x = 40 is at canvas x = 15

                new Grid(20, 'lines').draw(asContext, state);

                expect(verticalLinesAt(ctx, state)).toEqual([15.5, 35.5, 55.5]);
                expect(horizontalLinesAt(ctx, state)).toEqual([0.5, 20.5, 40.5]);
            });

            it('draws its lines at multiples of the spacing in diagram coordinates', () => {
                const { ctx, asContext } = makeContext(100, 100);

                new Grid(30, 'lines').draw(asContext, at(500, 500));

                // what the grid itself draws, before the layer's transform: x = -480, -450, -420 (+ half a pixel)
                const xs = ctx.moveTo.mock.calls.filter(([, y]) => y === -500).map(([x]) => x - 0.5);
                expect(xs).toEqual([-480, -450, -420]);
                xs.forEach(x => expect(Math.abs(x % 30)).toBe(0));
            });

            it('puts the dots on the anchored grid points', () => {
                const { ctx, asContext } = makeContext(100, 100);
                const state = at(500, 500);

                new Grid(30, 'dots').draw(asContext, state);

                // one dotted column per grid line, each dash pattern starting on the first grid row (y = 20)
                expect(columnStartsAt(ctx, state)).toEqual([{ x: 20, y: 19 }, { x: 50, y: 19 }, { x: 80, y: 19 }]);
            });

            it('keeps a component on a grid line after the canvas grows 500px to the left', () => {
                // spacing 30 doesn't divide 500, so a grid drawn from the canvas edge would move under the component
                const grid = new Grid(30, 'lines');
                const componentX = 30; // diagram position, on a grid line
                const before = makeContext(600, 60);
                const after = makeContext(1100, 60);
                const beforeState = at(0, 0);
                const afterState = at(500, 0); // what panActiveDiagram does when it grows the canvas left

                grid.draw(before.asContext, beforeState);
                grid.draw(after.asContext, afterState);

                expect(verticalLinesAt(before.ctx, beforeState)).toContain(0 + componentX + 0.5);
                expect(verticalLinesAt(after.ctx, afterState)).toContain(500 + componentX + 0.5);
            });
        });

        describe('zoomed', () => {
            it('spaces the lines by the spacing times the zoom on the canvas', () => {
                const { ctx, asContext } = makeContext(100, 60);
                const state = at(0, 0, 2); // the canvas shows 50 x 30 of the diagram

                new Grid(20, 'lines').draw(asContext, state);

                expect(verticalLinesAt(ctx, state)).toEqual([0.5, 40.5, 80.5]);
                expect(horizontalLinesAt(ctx, state)).toEqual([0.5, 40.5]);
            });

            it('keeps the lines 1px wide on the canvas', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid(20, 'lines').draw(asContext, at(0, 0, 2));

                expect(ctx.lineWidth).toBe(0.5); // half a diagram unit = 1 canvas pixel at 2x
            });

            it('keeps the dots 2px on the canvas', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid(20, 'dots').draw(asContext, at(0, 0, 2));

                expect(ctx.lineWidth).toBe(1); // 1 diagram unit = 2 canvas pixels at 2x
                expect(ctx.setLineDash).toHaveBeenCalledWith([1, 19]);
            });
        });

        it('draws with the mode and spacing it was last given', () => {
            const grid = new Grid(20, 'lines');
            grid.gridMode = 'dots';
            grid.gridSpacing = 50;
            const { ctx, asContext } = makeContext(100, 60);

            grid.draw(asContext, drawState);

            expect(ctx.setLineDash).toHaveBeenCalledWith([2, 48]);
            expect(columnStartsAt(ctx, drawState).map(p => p.x)).toEqual([0, 50]);
        });
    });
});
