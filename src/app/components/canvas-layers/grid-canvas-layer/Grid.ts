import type { Drawable, DrawState } from "../../../models/Drawable";

export type GridMode = 'lines' | 'dots';
export class Grid implements Drawable {

    public gridSpacing: number;
    public gridMode: GridMode;
    private _width: number;
    private _height: number;

    constructor(gridSpacing: number, gridMode: GridMode) {
        this.gridSpacing = gridSpacing;
        this.gridMode = gridMode;
        this._width = this._height = 0;
    }

    private _updateDimensions(ctx: OffscreenCanvasRenderingContext2D): void {
        this._width = ctx.canvas.width;
        this._height = ctx.canvas.height;
    }

    /**
     * Handles individual component drawing function.
     * A canvas with no area (hidden tab, mid-resize) has nothing to draw on, so it is skipped rather than treated as
     * an error. The layer marks every drawable for an update when the canvas gets a size again.
     *
     * The grid is anchored to the diagram origin: its lines sit at diagram positions that are multiples of the spacing,
     * which on the canvas is origin + k * spacing. So the grid stays put under the components when the origin moves
     * (the canvas growing left or up), and snapping a diagram position is just rounding it to a multiple of the spacing.
     *
     * @param ctx The 2D context on which to draw
     * @param drawState Global draw state information; its origin is where diagram (0, 0) is on the canvas
     */
    public draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
        this._updateDimensions(ctx);

        if (this._width === 0 || this._height === 0) return;

        // the first grid line at or after the canvas edge
        const firstX = positiveModulo(drawState.origin.x, this.gridSpacing);
        const firstY = positiveModulo(drawState.origin.y, this.gridSpacing);

        ctx.imageSmoothingEnabled = false;
        if (this.gridMode === 'lines') {
            ctx.strokeStyle = "lightgray";
            const lineWidth = 1;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([]);
            // starting offset of 0 or 0.5 depending on if pixel center doesn't fall in the middle of a line
            const startingOffset = 0.5 * (lineWidth % 2);
            for (let i = firstX + startingOffset; i < this._width; i += this.gridSpacing) {
                ctx.moveTo(i, 0);
                ctx.lineTo(i, this._height);
            }
            for (let i = firstY + startingOffset; i < this._height; i += this.gridSpacing) {
                ctx.moveTo(0, i);
                ctx.lineTo(this._width, i);
            }
        }
        else if (this.gridMode === 'dots') {
            ctx.strokeStyle = "lightgray";
            const dotStrokeWidth = 2;
            ctx.lineWidth = dotStrokeWidth;
            // each column is a dashed line whose dashes are the dots, one per cell, starting with the first grid row
            ctx.setLineDash([dotStrokeWidth, this.gridSpacing - dotStrokeWidth]);
            const startingXOffset = 0.5 * (dotStrokeWidth % 2);
            const startingY = firstY - dotStrokeWidth / 2; // centres each dot on its grid row
            for (let i = firstX + startingXOffset; i < this._width; i += this.gridSpacing) {
                ctx.moveTo(i, startingY);
                ctx.lineTo(i, this._height);
            }
        }
    }
}

/** `value` mod `modulus`, always in [0, modulus), so a negative origin still gives the first line on the canvas. */
function positiveModulo(value: number, modulus: number): number {
    return ((value % modulus) + modulus) % modulus;
}