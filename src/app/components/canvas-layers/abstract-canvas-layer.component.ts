import type { AfterViewInit, ElementRef } from "@angular/core";
import { Directive, Input } from "@angular/core";
import type { Drawable, DrawState } from "../../models/Drawable";

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
    protected forceClear: boolean;

    constructor() {
        this.drawableList = [];
        this.updateDrawableList = [];
        this.forceClear = true;
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
    }

    /**
     * The layer's canvas context
     */
    public get context(): CanvasRenderingContext2D | null {
        return this.ctx;
    }

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
        this.forceClear = false;
    }

    protected repaintCanvas() {
        const image = this.offscreen.transferToImageBitmap();
        this.context!.drawImage(image, 0, 0);
        image.close();
    }

    /**
     * Intelligently repaints the canvas layer
     * @param drawState
     */
    public abstract refresh(drawState: DrawState): void;
    abstract ngAfterViewInit(): void;
}
