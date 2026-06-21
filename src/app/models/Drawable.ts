// import { AbstractCanvasWrapper } from "./Layers/AbstractLayer";
import { Point } from "./Point";

export type DrawState = {
    origin: Point,
    scale: number
};

export interface Drawable {
    draw(ctx: CanvasRenderingContext2D, state: DrawState): void;
}