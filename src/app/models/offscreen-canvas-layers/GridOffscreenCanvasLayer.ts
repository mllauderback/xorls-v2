import { Grid, GridMode } from "../Grid";
import { OffscreenCanvasLayer } from "./OffscreenCanvasLayer";

export class GridOffscreenCanvasLayer extends OffscreenCanvasLayer {
    private grid: Grid;

    constructor(width: number, height: number) {
        super(width, height);
        this.grid = new Grid(20, 'dots');
        this.add(this.grid);
    }

    public set gridMode(mode: GridMode | undefined) {
        const gridMode = mode ?? 'dots';
        this.onGridModeChanged(gridMode);
    }

    public get gridMode(): GridMode {
        return this.grid.gridMode;
    }

    public set gridSpacing(spacing: number | undefined) {
        const gridSpacing = spacing ?? 20;
        this.onGridSpacingChanged(gridSpacing);
    }

    public get gridSpacing(): number {
        return this.grid.gridSpacing;
    }

    private onGridSpacingChanged(gridSpacing: number) {
        if (!gridSpacing || !this.grid) {
            console.warn('Cannot update grid spacing, skipping.');
            return;
        }
        this.grid.gridSpacing = gridSpacing;
        this.markforUpdate(this.grid);
        this.forceClear = true;
    }

    private onGridModeChanged(gridMode: GridMode) {
        if (!gridMode || !this.grid) {
            console.warn('Cannot update grid mode, skipping.');
            return;
        }
        this.grid.gridMode = gridMode;
        this.markforUpdate(this.grid);
        this.forceClear = true;
    }
}