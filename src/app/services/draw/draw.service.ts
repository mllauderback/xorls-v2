import { Injectable } from '@angular/core';
import { Point } from '../../models/Point';
import { Drawable } from '../../models/Drawable';
import { CanvasWrapper } from '../../models/components/CanvasWrapper';

@Injectable({
    providedIn: 'root'
})
export class DrawService {
    private readonly NULL_CANVAS_CONTEXT: string = "Null canvas context.";

    /**
     * Calls the passed-in drawable's getPath2D() function to draw on the destination canvas
     * element.
     * 
     * @param drawable A single drawable instance
     * @param canvas Destination canvas to draw on
     */
    public drawSingle(drawable: Drawable, canvas: CanvasWrapper) {
        if (!canvas.hasValidContext()) {
            throw new Error(this.NULL_CANVAS_CONTEXT);
        }
        let path: Path2D = drawable.getPath2D();

        canvas.context.stroke(path);
    }

    /**
     * Iterates through a list of drawables and calls each drawable's getPath2D() function
     * to draw on the destination canvas element.
     * 
     * @param drawables A list of drawable instances
     * @param canvas Destination canvas to draw on
     */
    public drawList(drawables: Drawable[], canvas: CanvasWrapper) {
        for (let drawable of drawables) {
            this.drawSingle(drawable, canvas);
        }
    }

    public setLineDash(canvas: HTMLCanvasElement, dashSegments: Iterable<number>) {
        let ctx = canvas.getContext('2d');
        if (!ctx) throw new Error(this.NULL_CANVAS_CONTEXT);

        ctx.setLineDash(dashSegments);
    }
}
