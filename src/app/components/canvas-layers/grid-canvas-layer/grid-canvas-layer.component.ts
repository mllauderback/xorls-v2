import type { ElementRef } from '@angular/core';
import { Component, inject, Input, ViewChild } from '@angular/core';
import { AbstractCanvasLayerComponent } from '../abstract-canvas-layer.component';
import type { Drawable, DrawState } from '../../../models/Drawable';
import { CommonModule } from '@angular/common';
import { RenderService } from '../../../services/render/render.service';
import type { GridMode } from '../../../models/Grid';
import { Grid } from '../../../models/Grid';
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
        this.gridMode = settings.gridMode;
        this.gridSpacing = settings.gridSpacing;
    }

    set gridMode(mode: GridMode | null) {
        this._gridMode = mode ?? 'dots';
        this.onGridModeChanged(mode);
    }

    get gridMode(): GridMode | undefined {
        return this._gridMode;
    }

    get gridSpacing(): number | undefined {
        return this._gridSpacing;
    }

    set gridSpacing(spacing: number | null) {
        this._gridSpacing = spacing ?? 20;
        this.onGridSpacingChanged(spacing);
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

    override refresh(drawState: DrawState) {
        if (this.offscreenContext === null) {
            console.warn('Grid offscreenContext is null: Skipping refresh.');
            this.resetAllDrawablesForUpdates();
            return;
        }
        const updateDrawables: Drawable[] = this.getUpdateDrawablesList();
        if (this.forceClear) {
            this.offscreenContext.clearRect(0, 0, this.width, this.height);
            this.context?.clearRect(0, 0, this.width, this.height);
            const dpr = window.devicePixelRatio || 1;
            this.offscreenContext.scale(dpr, dpr);
            this.context?.scale(dpr, dpr);
        }
        if (updateDrawables.length === 0) return;
        this.offscreenContext.strokeStyle = 'black';
        this.offscreenContext.lineWidth = this.renderService.THIN_LINE_WIDTH;
        this.offscreenContext.beginPath();
        updateDrawables.forEach(d => d.draw(this.offscreenContext!, drawState));
        this.offscreenContext.stroke();
        // console.log('repaint');
        this.repaintCanvas();
        this.resetAllDrawablesForUpdates();
    }

    private onGridSpacingChanged(gridSpacing?: number | null) {
        if (!gridSpacing || !this.grid) {
            console.warn('Cannot update grid spacing - skipping update');
            return;
        }
        this.grid.gridSpacing = gridSpacing;
        this.markForUpdate(this.grid);
        this.forceClear = true;
    }

    private onGridModeChanged(gridMode?: GridMode | null) {
        if (!gridMode || !this.grid) {
            console.warn('Cannot update grid mode - skipping update');
            return;
        }
        this.grid.gridMode = gridMode;
        this.markForUpdate(this.grid);
        this.forceClear = true;
    }
}
