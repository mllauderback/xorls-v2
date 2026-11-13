import type { ElementRef } from '@angular/core';
import { Component, inject, Input, ViewChild } from '@angular/core';
import { AbstractCanvasLayerComponent } from '../abstract-canvas-layer.component';
import type { Drawable, DrawState } from '../../../models/Drawable';
import { CommonModule } from '@angular/common';
import { RenderService } from '../../../services/render/render.service';
import type { GridMode } from './Grid';
import { Grid } from './Grid';
import type { GridSettingsState } from '../../../store/settings/state';

@Component({
    selector: 'app-grid-canvas-layer',
    imports: [CommonModule],
    template: `
    <canvas #canvas (contextmenu)="$event.preventDefault()" [ngStyle]="{'z-index': zIndex, 'background': bground}"></canvas>
    `
})
export class GridCanvasLayerComponent extends AbstractCanvasLayerComponent {
    private renderService = inject(RenderService);

    private grid?: Grid;
    private _gridMode?: GridMode;
    private _gridSpacing?: number;

    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    @Input()
    set gridSettings(settings: GridSettingsState | null | undefined) {
        if (!settings) {
            console.warn('Settings is null or undefined - skipping update.');
            return;
        }
        this._gridMode = settings.gridMode ?? 'dots';
        this._gridSpacing = settings.gridSpacing ?? 20;
        // both values go to the grid in one step so it is marked, and drawn, once
        this.applyToGrid(settings.gridMode, settings.gridSpacing);
    }

    set gridMode(mode: GridMode | null) {
        this._gridMode = mode ?? 'dots';
        this.applyToGrid(mode, undefined);
    }

    get gridMode(): GridMode | undefined {
        return this._gridMode;
    }

    get gridSpacing(): number | undefined {
        return this._gridSpacing;
    }

    set gridSpacing(spacing: number | null) {
        this._gridSpacing = spacing ?? 20;
        this.applyToGrid(undefined, spacing);
    }

    constructor() {
        super();
        const mode = this.gridMode ?? 'dots';
        const spacing = this.gridSpacing ?? 20;
        this.grid = new Grid(spacing, mode);
        this.add(this.grid);
    }

    override ngAfterViewInit(): void {
        const width = this.canvasRef.nativeElement.width;
        const height = this.canvasRef.nativeElement.height;
        this.initCanvas(new OffscreenCanvas(width, height), this.canvasRef);
    }

    protected override render(drawState: DrawState) {
        if (this.offscreenContext === null) {
            console.warn('Grid offscreenContext is null: Skipping refresh.');
            this.resetAllDrawablesForUpdates();
            return;
        }
        const updateDrawables: Drawable[] = this.getUpdateDrawablesList();
        if (this.forceClearAll) {
            this.clearOffscreenCanvas();
            this.clearCanvas();
        }
        if (updateDrawables.length > 0) {
            this.offscreenContext.strokeStyle = 'black';
            this.offscreenContext.lineWidth = this.renderService.THIN_LINE_WIDTH;
            this.offscreenContext.beginPath();
            updateDrawables.forEach(d => d.draw(this.offscreenContext!, drawState));
            this.offscreenContext.stroke();
            this.updateCachedOffscreenImage();
            this.resetAllDrawablesForUpdates();
        }
        if (updateDrawables.length > 0 || this.forceRepaint) {
            this.repaintCanvas();
        }
    }

    /**
     * Gives the grid new settings and, if anything changed, repaints it once on the next refresh.
     * `undefined` means "leave this one alone"; `null` or an invalid value is skipped with a warning.
     */
    private applyToGrid(gridMode: GridMode | null | undefined, gridSpacing: number | null | undefined) {
        if (!this.grid) {
            console.warn('Cannot update grid settings - no grid.');
            return;
        }
        let changed = false;
        if (gridMode !== undefined) {
            if (gridMode) {
                this.grid.gridMode = gridMode;
                changed = true;
            }
            else console.warn('Cannot update grid mode - skipping update');
        }
        if (gridSpacing !== undefined) {
            if (gridSpacing) {
                this.grid.gridSpacing = gridSpacing;
                changed = true;
            }
            else console.warn('Cannot update grid spacing - skipping update');
        }
        if (!changed) return;
        this.markForUpdate(this.grid);
        this.forceClearAll = true;
    }
}
