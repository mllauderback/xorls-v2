import type { AfterViewInit, ElementRef} from "@angular/core";
import { Directive, Input } from "@angular/core";
import type { Drawable, DrawState } from "../../models/Drawable";

@Directive()
export abstract class AbstractCanvasLayerComponent implements AfterViewInit {

    @Input() zIndex?: number;
    @Input() bground?: string;
    
    private ctx!: CanvasRenderingContext2D | null;
    protected drawableList: Drawable[];
    protected updateDrawableList: Drawable[];
    protected canvas!: HTMLCanvasElement;
    protected forceClear: boolean;

    constructor() {
        this.drawableList = [];
        this.updateDrawableList = [];
        this.forceClear = true;
    }

    protected initCanvas(canvasRef: ElementRef<HTMLCanvasElement>) {
        this.canvas = canvasRef.nativeElement;
        this.ctx = this.canvas.getContext('2d');
    }

    protected set width(width: number) {
        if (this.canvas.width === width) return;
        this.canvas.width = width;
        const dpr = window.devicePixelRatio || 1;
        this.ctx?.scale(dpr, dpr);
        this.markAllDrawablesForUpdates();
    }

    public get width() {
        return this.canvas.width;
    }

    protected set height(height: number) {
        if (this.canvas.height === height) return;
        this.canvas.height = height;
        const dpr = window.devicePixelRatio || 1;
        this.ctx?.scale(dpr, dpr);
        this.markAllDrawablesForUpdates();
    }

    public get height() {
        return this.canvas.height;
    }

    public resize(width: number, height: number) {
        if (this.canvas.width === width && this.canvas.height === height) return;
        this.width = width;
        this.height = height;
        const dpr = window.devicePixelRatio || 1;
        this.ctx?.scale(dpr, dpr);
        this.markAllDrawablesForUpdates();
    }

    public get context(): CanvasRenderingContext2D | null {
        return this.ctx;
    }

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

    public getDrawableList(): Drawable[] {
        return this.drawableList;
    }

    public getUpdateDrawablesList(): Drawable[] {
        return this.updateDrawableList;
    }

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

    public abstract refresh(drawState: DrawState): void;

    abstract ngAfterViewInit(): void;
}
