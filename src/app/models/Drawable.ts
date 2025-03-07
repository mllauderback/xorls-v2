import { BufferedCanvas } from "./BufferedCanvas";
import { Point } from "./Point";

export interface Drawable {
    draw(origin: Point, bufferedCanvas: BufferedCanvas, forceUpdate?: boolean): void; // might add canvas context...
}