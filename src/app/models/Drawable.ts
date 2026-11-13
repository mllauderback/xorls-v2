import type { ViewTransform } from "../services/render/view-transform";

/**
 * The read-only side of a ViewTransform: what layers, drawables and the helpers below get. It is derived from the
 * ViewTransform class and leaves out shiftOrigin/setScale because only the RenderService changes
 * the view.
 */
export type DrawState = Pick<ViewTransform, 'origin' | 'scale' | 'version'>;

export interface Drawable {
    /**
     * Draws in diagram coordinates. The layer has already set the context's transform from the draw state, so a
     * drawable doesn't need the origin or scale to place itself.
     */
    draw(ctx: OffscreenCanvasRenderingContext2D, state: DrawState): void;
}