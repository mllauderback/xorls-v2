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
 * their cached bitmaps instead); the origin moves when the layers grow left or up, and the scale is the zoom.
 * Every change bumps `version`. Layers compare it on each refresh and redraw everything when it differs from the
 * version they last drew, so nothing has to be told about changes.
 */
export class ViewTransform {
    private readonly _origin: Point;
    private _scale: number;
    private _version = 0;

    constructor(origin: Point = { x: 0, y: 0 }, scale = 1) {
        this._origin = { x: origin.x, y: origin.y };
        this._scale = scale;
    }

    get origin(): Readonly<Point> {
        return this._origin;
    }

    get scale(): number {
        return this._scale;
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

    setScale(scale: number): void {
        if (scale === this._scale) return;
        this._scale = scale;
        this._version++;
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
