import { describe, it, expect, vi } from 'vitest';

import type { DrawState } from '../../../models/Drawable';
import { Grid } from './Grid';

const drawState: DrawState = { origin: { x: 0, y: 0 }, scale: 1 };

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

                // x = 0.5, 20.5, 40.5, 60.5, 80.5 and y = 0.5, 20.5, 40.5
                expect(ctx.moveTo).toHaveBeenCalledTimes(8);
                expect(ctx.moveTo).toHaveBeenCalledWith(20.5, 0);
                expect(ctx.moveTo).toHaveBeenCalledWith(0, 20.5);
            });

            it('draws fewer lines when the spacing is wider', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid(50, 'lines').draw(asContext, drawState);

                // x = 0.5, 50.5 and y = 0.5, 50.5
                expect(ctx.moveTo).toHaveBeenCalledTimes(4);
            });
        });

        describe('dots mode', () => {
            it('draws dotted vertical lines, one per cell across the width', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid(20, 'dots').draw(asContext, drawState);

                expect(ctx.setLineDash).toHaveBeenCalledWith([2, 18]);
                expect(ctx.moveTo).toHaveBeenCalledTimes(5); // x = 0, 20, 40, 60, 80
            });
        });

        describe('anchored to the diagram origin', () => {
            const at = (x: number, y: number): DrawState => ({ origin: { x, y }, scale: 1 });
            const verticalLinesAt = (ctx: ReturnType<typeof makeContext>['ctx']) =>
                ctx.moveTo.mock.calls.filter(([, y]) => y === 0).map(([x]) => x);
            const horizontalLinesAt = (ctx: ReturnType<typeof makeContext>['ctx']) =>
                ctx.moveTo.mock.calls.filter(([x]) => x === 0).map(([, y]) => y);

            it('starts at the first grid line after the canvas edge when the origin is not a multiple of the spacing', () => {
                const { ctx, asContext } = makeContext(100, 100);

                new Grid(30, 'lines').draw(asContext, at(500, 500)); // 500 = 16 * 30 + 20

                expect(verticalLinesAt(ctx)).toEqual([20.5, 50.5, 80.5]);
                expect(horizontalLinesAt(ctx)).toEqual([20.5, 50.5, 80.5]);
            });

            it('starts at the canvas edge when the origin is a multiple of the spacing', () => {
                const { ctx, asContext } = makeContext(100, 60);

                new Grid(20, 'lines').draw(asContext, at(500, 40));

                expect(verticalLinesAt(ctx)).toEqual([0.5, 20.5, 40.5, 60.5, 80.5]);
                expect(horizontalLinesAt(ctx)).toEqual([0.5, 20.5, 40.5]);
            });

            it('handles an origin left of or above the canvas', () => {
                const { ctx, asContext } = makeContext(60, 60);

                new Grid(20, 'lines').draw(asContext, at(-25, -40)); // diagram x = 40 is at canvas x = 15

                expect(verticalLinesAt(ctx)).toEqual([15.5, 35.5, 55.5]);
                expect(horizontalLinesAt(ctx)).toEqual([0.5, 20.5, 40.5]);
            });

            it('puts the dots on the anchored grid points', () => {
                const { ctx, asContext } = makeContext(100, 100);

                new Grid(30, 'dots').draw(asContext, at(500, 500));

                // one dotted column per grid line, each dash pattern starting on the first grid row (y = 20)
                expect(ctx.moveTo.mock.calls).toEqual([[20, 19], [50, 19], [80, 19]]);
            });

            it('keeps a component on a grid line after the canvas grows 500px to the left', () => {
                // spacing 30 doesn't divide 500, so a grid drawn from the canvas edge would move under the component
                const grid = new Grid(30, 'lines');
                const componentX = 30; // diagram position, on a grid line
                const before = makeContext(600, 60);
                const after = makeContext(1100, 60);

                grid.draw(before.asContext, at(0, 0));
                grid.draw(after.asContext, at(500, 0)); // what panActiveDiagram does when it grows the canvas left

                expect(verticalLinesAt(before.ctx)).toContain(0 + componentX + 0.5);
                expect(verticalLinesAt(after.ctx)).toContain(500 + componentX + 0.5);
            });
        });

        it('draws with the mode and spacing it was last given', () => {
            const grid = new Grid(20, 'lines');
            grid.gridMode = 'dots';
            grid.gridSpacing = 50;
            const { ctx, asContext } = makeContext(100, 60);

            grid.draw(asContext, drawState);

            expect(ctx.setLineDash).toHaveBeenCalledWith([2, 48]);
            expect(ctx.moveTo).toHaveBeenCalledTimes(2); // x = 0, 50
        });
    });
});
