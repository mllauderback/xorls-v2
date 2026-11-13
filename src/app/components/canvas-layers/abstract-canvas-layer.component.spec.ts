import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Drawable, DrawState } from '../../models/Drawable';
import { ComponentCanvasLayerComponent } from './component-canvas-layer/component-canvas-layer.component';

// AbstractCanvasLayerComponent can't be instantiated directly, so these tests go through a concrete layer.
describe('AbstractCanvasLayerComponent', () => {
    let layer: ComponentCanvasLayerComponent;
    let warnSpy: ReturnType<typeof vi.spyOn>;

    const makeDrawable = (): Drawable => ({ draw: () => { /* not needed for list bookkeeping */ } });

    beforeEach(() => {
        layer = TestBed.createComponent(ComponentCanvasLayerComponent).componentInstance;
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { /* keep test output quiet */ });
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    describe('markForUpdate', () => {
        it('queues a drawable that is the only one in the layer', () => {
            const a = makeDrawable();
            layer.add(a);
            layer.resetAllDrawablesForUpdates();

            layer.markForUpdate(a);

            expect(layer.getUpdateDrawablesList()).toEqual([a]);
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('queues a drawable that is in the layer alongside other drawables', () => {
            const a = makeDrawable();
            const b = makeDrawable();
            layer.add(a);
            layer.add(b);
            layer.resetAllDrawablesForUpdates();

            layer.markForUpdate(a);

            expect(layer.getUpdateDrawablesList()).toEqual([a]);
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('queues only the requested drawable, not the others', () => {
            const a = makeDrawable();
            const b = makeDrawable();
            const c = makeDrawable();
            [a, b, c].forEach(d => layer.add(d));
            layer.resetAllDrawablesForUpdates();

            layer.markForUpdate(b);

            expect(layer.getUpdateDrawablesList()).toEqual([b]);
        });

        it('ignores a drawable that is not in the layer and warns', () => {
            const inLayer = makeDrawable();
            const stranger = makeDrawable();
            layer.add(inLayer);
            layer.resetAllDrawablesForUpdates();

            layer.markForUpdate(stranger);

            expect(layer.getUpdateDrawablesList()).not.toContain(stranger);
            expect(layer.getUpdateDrawablesList()).toHaveLength(0);
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('ignores a drawable when the layer is empty and warns', () => {
            const stranger = makeDrawable();

            layer.markForUpdate(stranger);

            expect(layer.getUpdateDrawablesList()).toHaveLength(0);
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('queues a drawable once however many times it is marked', () => {
            const a = makeDrawable();
            layer.add(a);
            layer.resetAllDrawablesForUpdates();

            layer.markForUpdate(a);
            layer.markForUpdate(a);

            expect(layer.getUpdateDrawablesList()).toEqual([a]);
        });

        it('does not queue a drawable that is already waiting to be painted', () => {
            const a = makeDrawable();
            layer.add(a); // add() queues it

            layer.markForUpdate(a);

            expect(layer.getUpdateDrawablesList()).toEqual([a]);
        });
    });

    describe('add', () => {
        it('puts the drawable in the layer and queues it for painting', () => {
            const a = makeDrawable();

            layer.add(a);

            expect(layer.getDrawableList()).toEqual([a]);
            expect(layer.getUpdateDrawablesList()).toEqual([a]);
        });
    });

    describe('markAllDrawablesForUpdates', () => {
        it('queues every drawable in the layer', () => {
            const a = makeDrawable();
            const b = makeDrawable();
            layer.add(a);
            layer.add(b);
            layer.resetAllDrawablesForUpdates();

            layer.markAllDrawablesForUpdates();

            expect(layer.getUpdateDrawablesList()).toEqual([a, b]);
        });

        it('keeps the update queue separate from the drawable list', () => {
            const a = makeDrawable();
            layer.add(a);

            layer.markAllDrawablesForUpdates();

            expect(layer.getUpdateDrawablesList()).not.toBe(layer.getDrawableList());
        });

        it('does not put drawables into the layer twice when one is added or marked afterwards', () => {
            const a = makeDrawable();
            const b = makeDrawable();
            layer.add(a);
            layer.markAllDrawablesForUpdates(); // what resize(), redrawAll() and the remove methods do

            layer.add(b);
            layer.markForUpdate(a);

            expect(layer.getDrawableList()).toEqual([a, b]);
        });

        it('queues the remaining drawables after one is removed', () => {
            const a = makeDrawable();
            const b = makeDrawable();
            layer.add(a);
            layer.add(b);

            layer.removeDrawable(a);

            expect(layer.getDrawableList()).toEqual([b]);
            expect(layer.getUpdateDrawablesList()).toEqual([b]);
        });
    });

    describe('refresh', () => {
        type MockContext = Record<'setTransform' | 'resetTransform' | 'save' | 'restore' | 'clearRect' | 'scale', ReturnType<typeof vi.fn>>;
        const state = (version: number, origin = { x: 10, y: 20 }, scale = 2): DrawState => ({ origin, scale, version });
        const drawSpy = () => ({ draw: vi.fn() });
        const offscreen = () => layer.offscreenContext as unknown as MockContext;
        const onscreen = () => layer.context as unknown as MockContext;

        beforeEach(() => {
            const fixture = TestBed.createComponent(ComponentCanvasLayerComponent);
            fixture.detectChanges(); // creates the canvases and their contexts
            layer = fixture.componentInstance;
        });

        it('sets the offscreen context to draw in diagram coordinates before the drawables draw', () => {
            const calls: string[] = [];
            offscreen().setTransform.mockImplementation((...args: number[]) => calls.push(`setTransform ${args.join(',')}`));
            layer.add({ draw: () => calls.push('draw') });

            layer.refresh(state(0));

            expect(calls).toEqual(['setTransform 2,0,0,2,10,20', 'draw']);
        });

        it('passes the draw state to the drawables', () => {
            const a = drawSpy();
            layer.add(a);
            const drawState = state(0);

            layer.refresh(drawState);

            expect(a.draw).toHaveBeenCalledWith(layer.offscreenContext, drawState);
        });

        it('draws only what was marked while the draw state is unchanged', () => {
            const a = drawSpy();
            const b = drawSpy();
            layer.add(a);
            layer.add(b);
            layer.refresh(state(0));
            a.draw.mockClear();
            b.draw.mockClear();

            layer.markForUpdate(b);
            layer.refresh(state(0));

            expect(a.draw).not.toHaveBeenCalled();
            expect(b.draw).toHaveBeenCalledTimes(1);
        });

        it('clears and redraws everything when the draw state version changes', () => {
            const a = drawSpy();
            const b = drawSpy();
            layer.add(a);
            layer.add(b);
            layer.refresh(state(0));
            a.draw.mockClear();
            b.draw.mockClear();
            offscreen().clearRect.mockClear();

            layer.refresh(state(1, { x: 510, y: 20 }));

            expect(a.draw).toHaveBeenCalledTimes(1);
            expect(b.draw).toHaveBeenCalledTimes(1);
            expect(offscreen().clearRect).toHaveBeenCalled();
            expect(offscreen().setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 510, 20);
        });

        it('clears the whole offscreen canvas with the transform set aside, then puts it back', () => {
            const calls: string[] = [];
            const ctx = offscreen();
            (['save', 'resetTransform', 'clearRect', 'restore'] as const).forEach(name =>
                ctx[name].mockImplementation(() => calls.push(name)));

            layer.refresh(state(0)); // the first refresh clears everything

            expect(calls).toEqual(['save', 'resetTransform', 'clearRect', 'restore']);
        });

        it('never scales either context, however many times it repaints', () => {
            // ctx.scale multiplies onto the current transform, so scaling on every repaint used to compound
            layer.add(drawSpy());
            for (let i = 0; i < 5; i++) {
                layer.shiftViewportOffsetBy(1, 1); // forces a repaint of the main canvas
                layer.redrawAll();                 // and a full redraw of the offscreen one
                layer.refresh(state(i));
            }

            expect(offscreen().scale).not.toHaveBeenCalled();
            expect(onscreen().scale).not.toHaveBeenCalled();
            expect(onscreen().setTransform).not.toHaveBeenCalled(); // the main canvas is a 1:1 copy of the offscreen one
        });
    });
});