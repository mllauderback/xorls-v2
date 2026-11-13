import { describe, it, expect, vi } from 'vitest';
import { ViewTransform, applyDrawState, canvasToDiagram, diagramToCanvas, visibleDiagramRect } from './view-transform';
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

    describe('setScale', () => {
        it('changes the scale and bumps the version', () => {
            const view = new ViewTransform();

            view.setScale(2);

            expect(view.scale).toBe(2);
            expect(view.version).toBe(1);
        });

        it('leaves the version alone when the scale is unchanged', () => {
            const view = new ViewTransform();

            view.setScale(1);

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
        const changesTheView = (state: DrawState) => {
            // @ts-expect-error only the RenderService moves the origin, through the ViewTransform itself
            state.shiftOrigin(1, 1);
            // @ts-expect-error only the RenderService changes the zoom
            state.setScale(2);
            // @ts-expect-error the fields are read-only
            state.scale = 2;
        };

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
