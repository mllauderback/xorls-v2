import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { ActiveComponentCanvasLayerComponent } from './active-component-canvas-layer.component';
import { RenderService } from '../../../services/render/render.service';
import type { Drawable, DrawState } from '../../../models/Drawable';

const DRAW_STATE: DrawState = { origin: { x: 0, y: 0 }, scale: 1, version: 0 };

const buildDrawable = (isGhost?: boolean): Drawable => ({
    draw: vi.fn(),
    ...(isGhost === undefined ? {} : { isGhost }),
} as unknown as Drawable);

describe('ActiveComponentCanvasLayerComponent', () => {
    let component: ActiveComponentCanvasLayerComponent;
    let fixture: ComponentFixture<ActiveComponentCanvasLayerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ActiveComponentCanvasLayerComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(ActiveComponentCanvasLayerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('add', () => {
        it('should add a drawable once, even right after redrawAll()', () => {
            const drawable = buildDrawable(true);
            component.add(buildDrawable());
            component.redrawAll(); // makes the update list the same array as the drawable list

            component.add(drawable);

            expect(component.getDrawableList().filter(d => d === drawable)).toHaveLength(1);
        });

        it('should mark a new drawable for update', () => {
            const drawable = buildDrawable();
            component.refresh(DRAW_STATE); // settle the initial full clear
            component.add(drawable);
            expect(component.getUpdateDrawablesList()).toContain(drawable);
        });
    });

    describe('redrawAll', () => {
        it('should mark every drawable for update and force a clear', () => {
            const a = buildDrawable();
            const b = buildDrawable();
            component.add(a);
            component.add(b);
            component.refresh(DRAW_STATE);
            expect(component.getUpdateDrawablesList()).toEqual([]);

            component.redrawAll();

            expect(component.getUpdateDrawablesList()).toEqual([a, b]);
            expect(component['forceClearAll']).toBe(true);
        });
    });

    describe('refresh', () => {
        it('should draw ghosts through the render service so they get the ghost style', () => {
            const renderService = TestBed.inject(RenderService);
            const spy = vi.spyOn(renderService, 'drawDrawables');
            const ghost = buildDrawable(true);
            component.add(ghost);

            component.refresh(DRAW_STATE);

            expect(spy).toHaveBeenCalledWith(
                component.offscreenContext,
                [ghost],
                DRAW_STATE,
                { strokeStyle: 'blue', lineWidth: renderService.BOLD_LINE_WIDTH }
            );
        });

        it('should clear the layer and replace the cached image when the last drawable is removed', () => {
            const drawable = buildDrawable();
            component.add(drawable);
            component.refresh(DRAW_STATE);
            const cacheSpy = vi.spyOn(component as never, 'updateCachedOffscreenImage');
            const clearSpy = vi.spyOn(component as never, 'clearCanvas');

            component.removeDrawable(drawable);
            component.redrawAll();
            component.refresh(DRAW_STATE);

            expect(clearSpy).toHaveBeenCalled();
            expect(cacheSpy).toHaveBeenCalled();
            expect(component.getDrawableList()).toEqual([]);
        });

        it('should stop forcing a clear once the layer has been redrawn', () => {
            component.add(buildDrawable());
            component.redrawAll();
            component.refresh(DRAW_STATE);
            expect(component['forceClearAll']).toBe(false);
        });
    });
});
