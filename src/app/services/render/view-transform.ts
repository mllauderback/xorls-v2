import type { DrawState } from '../../models/Drawable';
import type { Point } from '../../models/Point';

/** An axis-aligned rectangle in diagram coordinates. */
export interface DiagramRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Where a diagram sits on its layers' offscreen canvases: canvas = diagram * scale + origin.
 *
 * The RenderService owns one per diagram and is the only thing that changes it. Panning never does (the layers move
 * their cached bitmaps instead); the origin moves when the layers grow left or up, and when zooming keeps a point
 * where it is on the screen. The scale is the zoom times the grid scale (the grid spacing setting / GRID_SPACING),
 * kept apart so that zooming and changing the grid spacing don't undo each other, and rounded so that a grid cell is
 * a whole number of pixels: with a whole-pixel origin too, grid lines land on whole pixels and stay sharp.
 * Every change to what is drawn bumps `version`. Layers compare it on each refresh and redraw everything when it
 * differs from the version they last drew, so nothing has to be told about changes. A zoom too small to change the
 * rounded scale changes nothing drawn, so it doesn't bump it.
 */
export class ViewTransform {
    private readonly _origin: Point;
    private _zoom: number;
    private _gridScale: number;
    private _version = 0;

    constructor(origin: Point = { x: 0, y: 0 }, zoom = 1, gridScale = 1) {
        this._origin = { x: origin.x, y: origin.y };
        this._zoom = zoom;
        this._gridScale = gridScale;
    }

    get origin(): Readonly<Point> {
        return this._origin;
    }

    /**
     * Diagram units to canvas pixels: the zoom times the grid scale, rounded to a whole number of pixels, and at least
     * one. Diagram units are grid cells (GRID_SPACING is 1), so a cell is a whole number of pixels.
     */
    get scale(): number {
        return Math.max(1, Math.round(this._zoom * this._gridScale));
    }

    get zoom(): number {
        return this._zoom;
    }

    /** The grid spacing setting / GRID_SPACING. */
    get gridScale(): number {
        return this._gridScale;
    }

    get version(): number {
        return this._version;
    }

    /** Moves where diagram (0, 0) is on the canvases. */
    shiftOrigin(dx: number, dy: number): void {
        if (dx === 0 && dy === 0) return;
        this._origin.x += dx;
        this._origin.y += dy;
        this._version++;
    }

    /** Sets the zoom. The version is bumped only if the rounded scale changes. */
    setZoom(zoom: number): void {
        const scale = this.scale;
        this._zoom = zoom;
        if (this.scale !== scale) this._version++;
    }

    /** Sets the grid scale. The version is bumped only if the rounded scale changes. */
    setGridScale(gridScale: number): void {
        const scale = this.scale;
        this._gridScale = gridScale;
        if (this.scale !== scale) this._version++;
    }
}


/**
 * Sets a context to draw in diagram coordinates. It replaces the context's transform rather than adding to it, so
 * it gives the same result however many times it is applied.
 */
export function applyDrawState(
    ctx: Pick<OffscreenCanvasRenderingContext2D, 'setTransform'>,
    state: DrawState
): void {
    ctx.setTransform(state.scale, 0, 0, state.scale, state.origin.x, state.origin.y);
}

/** A point on a layer's offscreen canvas, in diagram coordinates. */
export function canvasToDiagram(state: DrawState, point: Point): Point {
    return {
        x: (point.x - state.origin.x) / state.scale,
        y: (point.y - state.origin.y) / state.scale
    };
}

/** A diagram point, on a layer's offscreen canvas. */
export function diagramToCanvas(state: DrawState, point: Point): Point {
    return {
        x: point.x * state.scale + state.origin.x,
        y: point.y * state.scale + state.origin.y
    };
}

/**
 * A length in canvas pixels, in diagram units: what to give the context for something meant to look the same size
 * at any scale, like a line width, once the layer's transform is applied.
 */
export function pixelsToDiagram(pixels: number, state: Pick<DrawState, 'scale'>): number {
    return pixels / state.scale;
}

/** The part of the diagram that a canvas of the given size shows. */
export function visibleDiagramRect(state: DrawState, canvasWidth: number, canvasHeight: number): DiagramRect {
    const topLeft = canvasToDiagram(state, { x: 0, y: 0 });
    return {
        x: topLeft.x,
        y: topLeft.y,
        width: canvasWidth / state.scale,
        height: canvasHeight / state.scale
    };
}
