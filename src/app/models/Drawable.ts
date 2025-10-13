export interface Drawable {
    // draw(origin: Point, bufferedCanvas: BufferedCanvas, forceUpdate?: boolean): void; // might add canvas context...
    getPath2D(): Path2D;
}