import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { Drawable } from '../../models/Drawable';
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
});