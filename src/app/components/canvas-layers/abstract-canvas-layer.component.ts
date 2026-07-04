import type { AfterViewInit, ElementRef } from "@angular/core";
import { Directive, Input } from "@angular/core";
import type { Drawable, DrawState } from "../../models/Drawable";
import type { Point } from "../../models/Point";

@Directive()
export abstract class AbstractCanvasLayerComponent implements AfterViewInit {

    @Input() zIndex?: number;
    @Input() bground?: string;

    protected drawableList: Drawable[];
    protected updateDrawableList: Drawable[];
    protected canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D | null;
    protected offscreen!: OffscreenCanvas;
    private offscreenCtx!: OffscreenCanvasRenderingContext2D | null;
    protected forceClearAll: boolean;
    private _forceRepaint: boolean;
    private _viewportOffset: Point;

    private cachedOffscreenImage?: ImageBitmap;

    constructor() {
        this.drawableList = [];
        this.updateDrawableList = [];
        this.forceClearAll = true;
        this._forceRepaint = false;
        this._viewportOffset = { x: 0, y: 0 };
    }

    /**
     * Sets the layer canvas reference and context.
     * Should be called in the subclass's AfterViewInit hook.
     * @param canvasRef HTMLCanvasElement reference for the layer
     */
    protected initCanvas(offscreen: OffscreenCanvas, canvasRef: ElementRef<HTMLCanvasElement>) {
        this.canvas = canvasRef.nativeElement;
        this.ctx = this.canvas.getContext('2d');
        this.offscreen = offscreen;
        this.offscreenCtx = this.offscreen.getContext('2d');
    }

    /**
     * Returns the viewport offset used for drawing the offscreen canvas at a location on the main canvas
     */
    public get viewportOffset() {
        return this._viewportOffset;
    }

    /**
     * Change the viewport offset by dx,dy and force a repaint
     * @param dx x amount to change
     * @param dy y amount to change
     */
    public shiftViewportOffsetBy(dx: number, dy: number) {
        this._viewportOffset.x += dx;
        this._viewportOffset.y += dy;
        this._forceRepaint = true;
    }

    /**
     * Force or reset the main canvas to repaint.  Does not redraw the offscreen canvas.
     */
    public set forceRepaint(force: boolean) {
        this._forceRepaint = force;
    }

    /**
     * Return the value of forceRepaint
     */
    public get forceRepaint() {
        return this._forceRepaint;
    }

    /**
     * Sets the layer's canvas width and marks all drawables for updates
     */
    protected set width(width: number) {
        if (this.canvas.width === width) return;
        this.canvas.width = width;
        this.offscreen.width = width;
        const dpr = window.devicePixelRatio || 1;
        this.ctx?.scale(dpr, dpr);
        this.markAllDrawablesForUpdates();
    }

    /**
     * The layer's canvas width
     */
    public get width() {
        return this.canvas.width;
    }

    /**
     * Sets the layer's canvas height and marks all drawables for updates.
     */
    protected set height(height: number) {
        if (this.canvas.height === height) return;
        this.canvas.height = height;
        this.offscreen.height = height;
        this.markAllDrawablesForUpdates();
    }

    /**
     * The layer's canvas height
     */
    public get height() {
        return this.canvas.height;
    }

    /**
     * Resizes the layer's canvas and marks all drawables for updates.
     * @param width New canvas width
     * @param height New canvas height
     */
    public resize(width: number, height: number) {
        if (this.canvas.width === width && this.canvas.height === height) return;
        this.width = width;
        this.height = height;
        this.markAllDrawablesForUpdates();
        this._forceRepaint = true;
    }

    /**
     * The layer's canvas context
     */
    public get context(): CanvasRenderingContext2D | null {
        return this.ctx;
    }

    /**
     * The layer's offscreen canvas context
     */
    public get offscreenContext(): OffscreenCanvasRenderingContext2D | null {
        return this.offscreenCtx;
    }

    /**
     * The layer's canvas context z-index
     * @returns Z index as a string
     */
    public getZ(): string {
        return this.canvas.style.zIndex;
    }

    /**
     * Adds the drawable to the drawable list and marks it to be drawn on the next refresh cycle.
     * Existing drawables are not redrawn.
     * 
     * @param drawable Drawable instance to add
     */
    public add(drawable: Drawable) {
        this.drawableList.push(drawable);
        this.updateDrawableList.push(drawable);
    }

    /**
     * Removes the drawable at index from the drawables list and flags all
     * remaining drawables to be redrawn on the next refresh call.
     * 
     * @param drawable Drawable instance to remove
     * @returns void
     */
    public removeByIndex(index: number) {
        if (index < 0 || index >= this.drawableList.length) {
            throw new Error('Index out of bounds.');
        }
        this.drawableList.splice(index, 1);
        this.markAllDrawablesForUpdates();
    }

    /**
     * Removes the drawable instance from the drawables list and flags all
     * remaining drawables to be redrawn on the next refresh call.
     * 
     * @param drawable Drawable instance to remove
     * @returns void
     */
    public removeDrawable(drawable: Drawable) {
        const index = this.drawableList.indexOf(drawable);
        if (index === -1) {
            console.warn('Drawable not found in layer');
            return;
        }
        this.drawableList.splice(index, 1);
        this.markAllDrawablesForUpdates();
    }

    /**
     * The list of Drawable object which are painted on the layer's canvas
     * @returns The list of drawables in the layer
     */
    public getDrawableList(): Drawable[] {
        return this.drawableList;
    }

    /**
     * The list of Drawable objects which are marked for updates on the next render cycle.
     * @returns The list of drawables needing updates.
     */
    public getUpdateDrawablesList(): Drawable[] {
        return this.updateDrawableList;
    }

    /**
     * Marks a drawable instace to be repainted on the next render cycle.
     * If the layer doesn't have the drawable, the update list is left unchanged.
     * @param drawable The Drawable instace to repaint
     */
    public markForUpdate(drawable: Drawable) {
        if (this.drawableList.find(d => d !== drawable)) {
            console.warn('Drawable marked for update not found.  Skipping.');
            return;
        }
        this.updateDrawableList.push(drawable);
    }

    /**
     * Sets the update drawables list to the list of all drawables which will be updated on the next refresh call.
     */
    public markAllDrawablesForUpdates() {
        // assigns drawableList reference to updateDrawableList - faster than [...drawableList]
        this.updateDrawableList = this.drawableList;
    }

    /**
     * Resets the update drawable list to empty.
     */
    public resetAllDrawablesForUpdates() {
        this.updateDrawableList = [];
        this.forceClearAll = false;
    }

    /**
     * Clears the offscreen canvas and rescales to the device pixel ratio.
     */
    protected clearOffscreenCanvas() {
        if (this.offscreenCtx === null) {
            console.warn('offscreen context is null.  skipping clear.');
            return;
        }
        this.offscreenCtx.clearRect(0, 0, this.width, this.height);
        const dpr = window.devicePixelRatio || 1;
        this.offscreenCtx.scale(dpr, dpr);
    }

    /**
     * Clears the main canvas and rescales to the device pixel ratio.
     */
    protected clearCanvas() {
        if (this.ctx === null) {
            console.warn('canvas context is null.  skipping clear.');
            return;
        }
        this.ctx.clearRect(0, 0, this.width, this.height);
        const dpr = window.devicePixelRatio || 1;
        this.ctx.scale(dpr, dpr);
    }

    /**
     * Cache the offscreen canvas as a bitmap.
     */
    protected updateCachedOffscreenImage() {
        this.cachedOffscreenImage = this.offscreen.transferToImageBitmap();
    }

    /**
     * Repaint the main canvas.  The cached offscreen canvas image is updated if its null.
     * The offscreen canvas is not redrawn.
     */
    protected repaintCanvas() {
        this.clearCanvas();
        const image = this.cachedOffscreenImage ?? this.offscreen.transferToImageBitmap();
        this.context!.drawImage(image, this._viewportOffset.x, this._viewportOffset.y);
        this._forceRepaint = false;
    }

    /**
     * Intelligently repaints the canvas layer
     * @param drawState
     */
    public abstract refresh(drawState: DrawState): void;
    abstract ngAfterViewInit(): void;
}
