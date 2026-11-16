import type { ElementRef } from '@angular/core';
import { Component, inject, Input, ViewChild } from '@angular/core';
import { AbstractCanvasLayerComponent } from '../abstract-canvas-layer.component';
import type { Drawable, DrawState } from '../../../models/Drawable';
import { CommonModule } from '@angular/common';
import { RenderService } from '../../../services/render/render.service';
import type { GridMode } from './Grid';
import { Grid } from './Grid';
import type { GridSettingsState } from '../../../store/settings/state';
import { pixelsToDiagram } from '../../../services/render/view-transform';

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

    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    /**
     * The grid only takes the mode from the settings. The spacing setting scales the whole diagram through the view
     * transform (see GRID_SPACING), which redraws every layer, this one included.
     */
    @Input()
    set gridSettings(settings: GridSettingsState | null | undefined) {
        if (!settings) {
            console.warn('Settings is null or undefined - skipping update.');
            return;
        }
        this.gridMode = settings.gridMode;
    }

    set gridMode(mode: GridMode | null | undefined) {
        this._gridMode = mode ?? 'dots';
        this.applyToGrid(mode);
    }

    get gridMode(): GridMode | undefined {
        return this._gridMode;
    }

    constructor() {
        super();
        this.grid = new Grid(this.gridMode ?? 'dots');
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
            this.offscreenContext.lineWidth = pixelsToDiagram(this.renderService.THIN_LINE_WIDTH, drawState);
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
     * Gives the grid a new mode and, if it changed, repaints it once on the next refresh.
     * `null`, `undefined` or an invalid value is skipped with a warning.
     */
    private applyToGrid(gridMode: GridMode | null | undefined) {
        if (!this.grid) {
            console.warn('Cannot update grid settings - no grid.');
            return;
        }
        if (!gridMode) {
            console.warn('Cannot update grid mode - skipping update');
            return;
        }
        if (gridMode === this.grid.gridMode) return;
        this.grid.gridMode = gridMode;
        this.markForUpdate(this.grid);
        this.forceClearAll = true;
    }
}
