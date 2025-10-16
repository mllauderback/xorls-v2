import { AbstractCanvasWrapper } from "./CanvasWrappers/AbstractCanvasWrapper";

export interface Drawable {
    // draw(origin: Point, bufferedCanvas: BufferedCanvas, forceUpdate?: boolean): void; // might add canvas context...
    // addToContext(context: CanvasRenderingContext2D): void;
    draw(canvas: AbstractCanvasWrapper, forceUpdate?: boolean): void;
}