import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { GridCanvasLayerComponent } from './grid-canvas-layer.component';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import type { Grid } from './Grid';

describe('GridCanvasLayerComponent', () => {
    let component: GridCanvasLayerComponent;
    let fixture: ComponentFixture<GridCanvasLayerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GridCanvasLayerComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GridCanvasLayerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('changing the grid settings', () => {
        let warnSpy: ReturnType<typeof vi.spyOn>;
        const grid = () => component.getDrawableList()[0] as Grid;
        const forceClearAll = () => (component as unknown as { forceClearAll: boolean }).forceClearAll;

        beforeEach(() => {
            warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { /* keep test output quiet */ });
            component.resetAllDrawablesForUpdates(); // start from "the first paint has happened"
            warnSpy.mockClear();
        });

        afterEach(() => warnSpy.mockRestore());

        it('has exactly one drawable, the grid', () => {
            expect(component.getDrawableList()).toHaveLength(1);
        });

        it('gives the grid both the new mode and the new spacing', () => {
            component.gridSettings = { gridMode: 'lines', gridSpacing: 40 };

            expect(grid().gridMode).toBe('lines');
            expect(grid().gridSpacing).toBe(40);
        });

        it('queues the grid once, not once per setting, and clears the canvas before it is painted', () => {
            component.gridSettings = { gridMode: 'lines', gridSpacing: 40 };

            expect(component.getUpdateDrawablesList()).toEqual([grid()]);
            expect(forceClearAll()).toBe(true);
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('queues the grid for a mode change on its own', () => {
            component.gridMode = 'lines';

            expect(grid().gridMode).toBe('lines');
            expect(component.getUpdateDrawablesList()).toEqual([grid()]);
        });

        it('queues the grid for a spacing change on its own and leaves the mode alone', () => {
            const modeBefore = grid().gridMode;

            component.gridSpacing = 35;

            expect(grid().gridSpacing).toBe(35);
            expect(grid().gridMode).toBe(modeBefore);
            expect(component.getUpdateDrawablesList()).toEqual([grid()]);
        });

        it('does nothing but warn when the settings are missing', () => {
            component.gridSettings = null;

            expect(component.getUpdateDrawablesList()).toHaveLength(0);
            expect(forceClearAll()).toBe(false);
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('skips an invalid spacing with a warning but still applies a valid mode', () => {
            const spacingBefore = grid().gridSpacing;

            component.gridSettings = { gridMode: 'lines', gridSpacing: 0 };

            expect(grid().gridMode).toBe('lines');
            expect(grid().gridSpacing).toBe(spacingBefore);
            expect(component.getUpdateDrawablesList()).toEqual([grid()]);
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('queues nothing when neither setting is usable', () => {
            component.gridSpacing = null;

            expect(component.getUpdateDrawablesList()).toHaveLength(0);
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('keeps working after another drawable joins the layer', () => {
            component.add({ draw: () => { /* e.g. an origin marker */ } });
            component.resetAllDrawablesForUpdates();

            component.gridSettings = { gridMode: 'lines', gridSpacing: 40 };

            expect(component.getUpdateDrawablesList()).toEqual([grid()]);
            expect(warnSpy).not.toHaveBeenCalled();
        });
    });
});
