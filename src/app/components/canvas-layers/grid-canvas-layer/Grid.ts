import type { Drawable, DrawState } from "../../../models/Drawable";
import { visibleDiagramRect } from "../../../services/render/view-transform";

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
     * The grid is drawn in diagram coordinates, like every drawable (the layer has set the context's transform): its
     * lines are at the multiples of the spacing, across the part of the diagram the canvas shows. So it stays put
     * under the components when the origin moves, and snapping is rounding a diagram position to the spacing.
     * Line widths and dot sizes are divided by the scale so the grid looks the same at any zoom.
     *
     * @param ctx The 2D context on which to draw, set to draw in diagram coordinates
     * @param drawState The diagram's view transform, used to work out which part of the diagram is visible
     */
    public draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
        this._updateDimensions(ctx);

        if (this._width === 0 || this._height === 0) return;

        const spacing = this.gridSpacing;
        const pixel = 1 / drawState.scale; // one canvas pixel in diagram units
        const visible = visibleDiagramRect(drawState, this._width, this._height);
        const right = visible.x + visible.width;
        const bottom = visible.y + visible.height;
        // the first grid line at or after the visible area's left and top edges
        const firstX = Math.ceil(visible.x / spacing) * spacing;
        const firstY = Math.ceil(visible.y / spacing) * spacing;

        ctx.imageSmoothingEnabled = false;
        if (this.gridMode === 'lines') {
            ctx.strokeStyle = "lightgray";
            const lineWidth = 1;
            ctx.lineWidth = lineWidth * pixel;
            ctx.setLineDash([]);
            // half a pixel across for an odd line width, so the line fills whole pixels instead of blurring over two
            const crisp = 0.5 * (lineWidth % 2) * pixel;
            for (let x = firstX; x < right; x += spacing) {
                ctx.moveTo(x + crisp, visible.y);
                ctx.lineTo(x + crisp, bottom);
            }
            for (let y = firstY; y < bottom; y += spacing) {
                ctx.moveTo(visible.x, y + crisp);
                ctx.lineTo(right, y + crisp);
            }
        }
        else if (this.gridMode === 'dots') {
            ctx.strokeStyle = "lightgray";
            const dot = 2 * pixel;
            ctx.lineWidth = dot;
            // each column is a dashed line whose dashes are the dots, one per cell, starting with the first grid row
            ctx.setLineDash([dot, spacing - dot]);
            const startingY = firstY - dot / 2; // centres each dot on its grid row
            for (let x = firstX; x < right; x += spacing) {
                ctx.moveTo(x, startingY);
                ctx.lineTo(x, bottom);
            }
        }
    }
}