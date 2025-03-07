import { Injectable } from '@angular/core';
import { Point } from '../../models/Point';
import { BufferedCanvas } from '../../models/BufferedCanvas';

@Injectable({
  providedIn: 'root'
})
export class DrawService {
  private activePath: boolean;
  public forceChanges: boolean;
  private readonly NO_ACTIVE_PATH: string = "No active path.";
  private readonly NULL_BUFFER_CONTEXT: string = "Null buffer context.";
  private readonly NULL_CANVAS_CONTEXT: string = "Null canvas context.";

  constructor() {
    this.activePath = false;
    this.forceChanges = false;
  }

  /**
   * Close existing path and stroke to buffer.
   * @param canvas
   */
  public drawToBuffer(canvas: BufferedCanvas): void {
    let ctx = canvas.getBufferContext();
    if (!ctx) throw new Error("Null Buffer Context");
    if (!this.activePath) throw new Error(this.NO_ACTIVE_PATH);
    ctx.closePath();
    ctx.stroke();
    this.activePath = false;
  }

  public draw(origin: Point, canvas: BufferedCanvas): void {
    let ctx = canvas.getCanvasContext();
    if (!ctx) throw new Error(this.NULL_CANVAS_CONTEXT);
    if (this.forceChanges) {
      console.log('draw call!');
      ctx.drawImage(canvas.getBuffer(), origin.x, origin.y);
    }
    this.forceChanges = false;
  }

  private clearBuffer(origin: Point, canvas: BufferedCanvas): void {
    let ctx = canvas.getBufferContext();
    if (!ctx) throw new Error(this.NULL_BUFFER_CONTEXT);
    ctx.clearRect(origin.x, origin.y, canvas.getWidth(), canvas.getHeight());
  }

  public redrawBuffer(origin: Point, canvas: BufferedCanvas, clear?: boolean): void {
    if (clear) {
      this.clearBuffer(origin, canvas);
    }
    for (let drawable of canvas.drawables) {
      drawable.draw(origin, canvas, true);
    }
  }

  /**
   * Begin active path for canvas context if one does not already exist.
   * @param ctx 
   * @param color 
   * @param strokeWidth 
   */
  public beginPath(canvas: BufferedCanvas, color?: string, strokeWidth?: number) {
    let ctx = canvas.getBufferContext();
    if (!ctx) throw new Error(this.NULL_BUFFER_CONTEXT);
    if (!this.activePath){
      ctx.beginPath();
      ctx.strokeStyle = color ?? "black";
      ctx.fillStyle = color ?? "black";
      ctx.lineWidth = strokeWidth ?? 1;
      ctx.imageSmoothingEnabled = false;
      this.activePath = true;
    }
  }

  /**
   * Add line to an active path.
   * @param origin
   * @param ctx 
   * @param from 
   * @param to 
   */
  public addLine(origin: Point, canvas: BufferedCanvas, from: Point, to: Point, dotSpacing?: number) {
    let ctx = canvas.getBufferContext();
    if (!ctx) throw new Error(this.NULL_BUFFER_CONTEXT);
    if (!this.activePath) throw new Error(this.NO_ACTIVE_PATH);
    // if (dotSpacing) {
    //   ctx.setLineDash([ctx.lineWidth - 0.5, dotSpacing - 0.5]);
    // }
    // else {
    //   ctx.setLineDash([]);
    // }
    ctx.moveTo(origin.x + from.x - 0.5, origin.y + from.y - 0.5);
    ctx.lineTo(origin.x + to.x - 0.5, origin.y + to.y - 0.5);
  }

  public setLineDash(canvas: BufferedCanvas, dashSegments: Iterable<number>) {
    let ctx = canvas.getBufferContext();
    if (!ctx) throw new Error(this.NULL_BUFFER_CONTEXT);

    ctx.setLineDash(dashSegments);
  }


}
