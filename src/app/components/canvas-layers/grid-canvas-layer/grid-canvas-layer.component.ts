import type { ElementRef, OnInit} from '@angular/core';
import { Component, DestroyRef, inject, ViewChild } from '@angular/core';
import { AbstractCanvasLayerComponent } from '../abstract-canvas-layer.component';
import type { Drawable, DrawState } from '../../../models/Drawable';
import { CommonModule } from '@angular/common';
import { RenderService } from '../../../services/render/render.service';
import type { Observable} from 'rxjs';
import { firstValueFrom, skip } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { GridMode } from '../../../models/Grid';
import { Grid } from '../../../models/Grid';
import { Store } from '@ngrx/store';
import type { WorkspaceState } from '../../../store/workspace/state';
import { selectGridMode, selectGridSpacing } from '../../../store/settings/feature';

@Component({
    selector: 'app-grid-canvas-layer',
    imports: [CommonModule],
    template: `
    <canvas #canvas (contextmenu)="$event.preventDefault()" [ngStyle]="{'z-index': zIndex, 'background': bground}"></canvas>
    `
})
export class GridCanvasLayerComponent extends AbstractCanvasLayerComponent implements OnInit {
    private store = inject<Store<WorkspaceState>>(Store);
    private renderService = inject(RenderService);

    @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

    private grid?: Grid;

    private gridMode$: Observable<GridMode>;
    private gridSpacing$: Observable<number>;
    private destroyRef = inject(DestroyRef);

    constructor() {
        super();
        this.gridMode$ = this.store.select(selectGridMode);
        this.gridSpacing$ = this.store.select(selectGridSpacing);
    }
    
    async ngOnInit(): Promise<void> {
        const mode = await firstValueFrom(this.gridMode$);
        const spacing = await firstValueFrom(this.gridSpacing$);
        this.grid = new Grid(spacing, mode);
        this.add(this.grid);

        this.gridMode$.pipe(skip(1), takeUntilDestroyed(this.destroyRef)).subscribe(gm => this.updateGridMode(gm));
        this.gridSpacing$.pipe(skip(1), takeUntilDestroyed(this.destroyRef)).subscribe(gs => this.updateGridSpacing(gs));
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

    private updateGridSpacing(gridSpacing?: number) {
        if (gridSpacing === undefined || this.grid === undefined) {
            console.warn('Cannot update grid spacing - skipping update');
            return;
        }
        this.grid.gridSpacing = gridSpacing;
        this.markForUpdate(this.grid);
        this.forceClear = true;
    }

    private updateGridMode(gridMode?: GridMode) {
        if (gridMode === undefined || this.grid === undefined) {
            console.warn('Cannot update grid mode - skipping update');
            return;
        }
        this.grid.gridMode = gridMode;
        this.markForUpdate(this.grid);
        this.forceClear = true;
    }
}
