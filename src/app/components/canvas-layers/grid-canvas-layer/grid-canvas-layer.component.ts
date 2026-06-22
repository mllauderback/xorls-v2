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

    @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;
    
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
        this.initCanvas(this.canvasRef!);
    }

    override refresh(drawState: DrawState) {
        // console.log(this.canvasRef?.nativeElement.clientWidth);
        if (this.context === null) {
            console.warn('Grid context is null: Skipping refresh.');
            this.resetAllDrawablesForUpdates();
            return;
        }
        const updateDrawables: Drawable[] = this.getUpdateDrawablesList();
        // console.log(updateDrawables.length);
        if (this.forceClear) this.context.clearRect(0, 0, this.width, this.height);
        this.context.strokeStyle = 'black';
        this.context.lineWidth = this.renderService.THIN_LINE_WIDTH;
        this.context.beginPath();
        updateDrawables.forEach(d => d.draw(this.context!, drawState));
        this.context.stroke();
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
