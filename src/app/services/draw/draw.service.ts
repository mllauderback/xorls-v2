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
     * Calls the passed-in drawable's addToContext() function to add paths and drawing instructions
     * to the destination canvas.
     * 
     * @param drawable A single drawable instance
     * @param canvas Destination canvas to draw on
     */
    public drawSingle(drawable: Drawable | null, canvas: CanvasWrapper, draw: boolean = false) {
        if (!drawable) {
            throw new Error("Null drawable");
        }
        if (!canvas.hasValidContext()) {
            throw new Error(this.NULL_CANVAS_CONTEXT);
        }
        drawable.addToContext(canvas.context);
        if (draw) {
            canvas.context.stroke();
        }
    }

    /**
     * Iterates through a list of drawables and calls each drawable's addToContext() function
     * to add paths and drawing instructions to the destination canvas
     * 
     * @param drawables A list of drawable instances
     * @param canvas Destination canvas to draw on
     */
    public drawList(drawables: Drawable[] | null, canvas: CanvasWrapper, draw: boolean = false) {
        if (!drawables) {
            throw new Error("Null drawable list");
        }
        for (let drawable of drawables) {
            this.drawSingle(drawable, canvas);
        }
        if (draw) {
            canvas.context.stroke();
        }
    }

    /**
     * Adds a line to the provided context.  This method does not stroke the context, it just adds a line to it.
     * 
     * @param context Canvas context onto which the line will be drawn
     * @param start Start point of the line
     * @param end End point of the line
     * @param dashList Array for drawing dashed lines, default is empty (solid)
     */
    public addLine(context: CanvasRenderingContext2D, start: Point, end: Point, dashList: number[] = []) {
        context.setLineDash(dashList);
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
    }
}
