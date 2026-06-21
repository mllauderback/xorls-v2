// import { AbstractCanvasWrapper } from "./Layers/AbstractLayer";
import type { Point } from "./Point";

export interface DrawState {
    origin: Point,
    scale: number
}

export interface Drawable {
    draw(ctx: CanvasRenderingContext2D, state: DrawState): void;
}