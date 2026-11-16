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
        function grid() {
            return component.getDrawableList()[0] as Grid;
        }
        function forceClearAll() {
            return (component as unknown as { forceClearAll: boolean }).forceClearAll;
        }

        beforeEach(() => {
            warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { /* keep test output quiet */ });
            component.resetAllDrawablesForUpdates(); // start from "the first paint has happened"
            warnSpy.mockClear();
        });

        afterEach(() => warnSpy.mockRestore());

        it('has exactly one drawable, the grid', () => {
            expect(component.getDrawableList()).toHaveLength(1);
        });

        it('gives the grid the new mode', () => {
            component.gridSettings = { gridMode: 'lines', gridSpacing: 40 };

            expect(grid().gridMode).toBe('lines');
        });

        it('queues the grid once and clears the canvas before it is painted', () => {
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

        it('queues nothing for a spacing change on its own: the view transform scales the grid instead', () => {
            const mode = grid().gridMode;

            component.gridSettings = { gridMode: mode, gridSpacing: 35 };

            expect(grid().gridMode).toBe(mode);
            expect(component.getUpdateDrawablesList()).toHaveLength(0);
            expect(forceClearAll()).toBe(false);
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('does nothing but warn when the settings are missing', () => {
            component.gridSettings = null;

            expect(component.getUpdateDrawablesList()).toHaveLength(0);
            expect(forceClearAll()).toBe(false);
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('queues nothing and warns when the mode is not usable', () => {
            const modeBefore = grid().gridMode;

            component.gridMode = null;

            expect(grid().gridMode).toBe(modeBefore);
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
