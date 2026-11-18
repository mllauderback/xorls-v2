import { describe, it, expect, vi } from 'vitest';
import { ViewTransform, applyDrawState, canvasToDiagram, diagramToCanvas, visibleDiagramRect, pixelsToDiagram } from './view-transform';
import type { DrawState } from '../../models/Drawable';

describe('ViewTransform', () => {
    it('starts at the origin with no zoom, at version 0', () => {
        const view = new ViewTransform();

        expect(view.origin).toEqual({ x: 0, y: 0 });
        expect(view.scale).toBe(1);
        expect(view.version).toBe(0);
    });

    it('copies the origin it is given, so changing that object later does not move the view', () => {
        const origin = { x: 5, y: 6 };
        const view = new ViewTransform(origin);

        origin.x = 100;

        expect(view.origin).toEqual({ x: 5, y: 6 });
    });

    describe('shiftOrigin', () => {
        it('moves the origin and bumps the version', () => {
            const view = new ViewTransform();

            view.shiftOrigin(500, 0);

            expect(view.origin).toEqual({ x: 500, y: 0 });
            expect(view.version).toBe(1);
        });

        it('bumps the version once for a shift in both directions', () => {
            const view = new ViewTransform();

            view.shiftOrigin(500, 500);

            expect(view.version).toBe(1);
        });

        it('leaves the version alone when nothing moves', () => {
            const view = new ViewTransform();

            view.shiftOrigin(0, 0);

            expect(view.version).toBe(0);
        });
    });

    describe('setZoom', () => {
        it('changes the zoom and the scale, and bumps the version', () => {
            const view = new ViewTransform();

            view.setZoom(2);

            expect(view.zoom).toBe(2);
            expect(view.scale).toBe(2);
            expect(view.version).toBe(1);
        });

        it('leaves the version alone when the zoom is unchanged', () => {
            const view = new ViewTransform();

            view.setZoom(1);

            expect(view.version).toBe(0);
        });
    });

    describe('setGridScale', () => {
        it('changes the grid scale and the scale, and bumps the version', () => {
            const view = new ViewTransform();

            view.setGridScale(20);

            expect(view.gridScale).toBe(20);
            expect(view.scale).toBe(20);
            expect(view.version).toBe(1);
        });

        it('leaves the version alone when the grid scale is unchanged', () => {
            const view = new ViewTransform();

            view.setGridScale(1);

            expect(view.version).toBe(0);
        });
    });

    it('scales by the zoom times the grid scale, so changing one keeps the other', () => {
        const view = new ViewTransform(undefined, 2, 15);
        expect(view.scale).toBe(30);

        view.setGridScale(20);
        expect(view.zoom).toBe(2);
        expect(view.scale).toBe(40);

        view.setZoom(1);
        view.setGridScale(15);
        expect(view.scale).toBe(15);
    });

    describe('scale', () => {
        it('rounds to a whole number of pixels per cell, so grid lines land on whole pixels', () => {
            expect(new ViewTransform(undefined, 1.1, 20).scale).toBe(22);
            expect(new ViewTransform(undefined, 1.33, 20).scale).toBe(27); // 26.6
            expect(new ViewTransform(undefined, 0.51, 25).scale).toBe(13); // 12.75
            expect(new ViewTransform(undefined, 1, 12.4).scale).toBe(12);
        });

        it('is at least one pixel per cell', () => {
            expect(new ViewTransform(undefined, 0.01, 20).scale).toBe(1);
        });
    });

    describe('version, for zooms smaller than a pixel per cell', () => {
        it('is not bumped by a zoom that leaves the rounded scale as it is', () => {
            const view = new ViewTransform(undefined, 1, 20);

            view.setZoom(1.01); // 20.2px cells, drawn as 20

            expect(view.zoom).toBe(1.01);
            expect(view.scale).toBe(20);
            expect(view.version).toBe(0);
        });

        it('is bumped once small zooms add up to a pixel', () => {
            const view = new ViewTransform(undefined, 1, 20);

            for (const zoom of [1.01, 1.02, 1.03]) view.setZoom(zoom);
            expect(view.version).toBe(1); // 20.6px, drawn as 21
            expect(view.scale).toBe(21);
        });

        it('is not bumped by a grid scale that leaves the rounded scale as it is', () => {
            const view = new ViewTransform(undefined, 1, 20);

            view.setGridScale(20.3);

            expect(view.version).toBe(0);
        });
    });
});

describe('DrawState', () => {
    it('is the read side of a ViewTransform', () => {
        const view: DrawState = new ViewTransform({ x: 1, y: 2 }, 3);

        expect(view.origin).toEqual({ x: 1, y: 2 });
        expect(view.scale).toBe(3);
        expect(view.version).toBe(0);
    });

    it('can be a plain object', () => {
        const state: DrawState = { origin: { x: 0, y: 0 }, scale: 1, version: 0 };

        expect(canvasToDiagram(state, { x: 5, y: 5 })).toEqual({ x: 5, y: 5 });
    });

    it('does not let whoever holds one change the view (checked by the type checker)', () => {
        // never called: the @ts-expect-error lines fail type checking if DrawState ever allows these
        function changesTheView(state: DrawState) {
            // @ts-expect-error only the RenderService moves the origin, through the ViewTransform itself
            state.shiftOrigin(1, 1);
            // @ts-expect-error only the RenderService changes the zoom
            state.setZoom(2);
            // @ts-expect-error only the RenderService changes the grid scale
            state.setGridScale(2);
            // @ts-expect-error the fields are read-only
            state.scale = 2;
        }

        expect(changesTheView).toBeTypeOf('function');
    });
});

describe('view transform helpers', () => {
    const state = { origin: { x: 500, y: -30 }, scale: 2, version: 0 };

    it('applyDrawState replaces the context transform with scale and origin', () => {
        const ctx = { setTransform: vi.fn() };

        applyDrawState(ctx, state);

        expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 500, -30);
    });

    it('diagramToCanvas scales then offsets by the origin', () => {
        expect(diagramToCanvas(state, { x: 10, y: 20 })).toEqual({ x: 520, y: 10 });
    });

    it('canvasToDiagram undoes diagramToCanvas', () => {
        const point = { x: -37, y: 12.5 };

        expect(canvasToDiagram(state, diagramToCanvas(state, point))).toEqual(point);
    });

    it('visibleDiagramRect is the canvas mapped back into the diagram', () => {
        expect(visibleDiagramRect(state, 800, 600)).toEqual({ x: -250, y: 15, width: 400, height: 300 });
    });
});

describe('pixelsToDiagram', () => {
    it('should give a length in canvas pixels in diagram units, which are grid cells', () => {
        expect(pixelsToDiagram(2, { scale: 20 })).toBe(0.1);
        expect(pixelsToDiagram(3, { scale: 50 })).toBeCloseTo(0.06);
    });

    it('should give the same length on the canvas at any scale', () => {
        for (const scale of [0.5, 1, 20, 37.5, 100]) {
            expect(pixelsToDiagram(2, { scale }) * scale).toBeCloseTo(2);
        }
    });
});
