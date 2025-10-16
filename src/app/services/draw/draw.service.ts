import { Injectable } from '@angular/core';
import { Point } from '../../models/Point';
import { Drawable } from '../../models/Drawable';

@Injectable({
    providedIn: 'root'
})
export class DrawService {

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
