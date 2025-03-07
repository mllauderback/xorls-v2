import { Drawable } from "./Drawable";

export class BufferedCanvas {
    private canvasHandle: HTMLCanvasElement;
    private bufferHandle: HTMLCanvasElement;
    public drawables: Drawable[];

    constructor(canvas: HTMLCanvasElement, buffer: HTMLCanvasElement) {
        this.canvasHandle = canvas;
        this.bufferHandle = buffer;
        this.bufferHandle.width = this.canvasHandle.width;
        this.bufferHandle.height = this.canvasHandle.height;
        this.bufferHandle.style.visibility = "hidden";
        // this.changes = false;
        this.drawables = [];
    }

    /**
     * Sets the width of the BufferedCanvas and its buffer.
     * @param width 
     */
    public setWidth(width: number): void {
        this.canvasHandle.width = width;
        this.bufferHandle.width = width;
    }

    /**
     * Sets the height of the BufferedCanvas and its buffer.
     * @param height 
     */
    public setHeight(height: number): void {
        this.canvasHandle.height = height;
        this.bufferHandle.height = height;
    }


    public getWidth(): number {
        return this.bufferHandle.width;
    }

    public getHeight(): number {
        return this.bufferHandle.height;
    }

    /**
     * Get the scroll width of the buffer.
     * @returns 
     */
    public getScrollWidth(): number {
        return this.bufferHandle.scrollWidth;
    }

    /**
     * Get the scroll height of the buffer.
     * @returns 
     */
    public getScrollHeight(): number {
        return this.bufferHandle.scrollHeight;
    }

    /**
     * Returns true if the buffer and canvas both have defined, non-null 2D contexts.
     * @returns 
     */
    public hasValidContexts(): boolean {
        return !!this.bufferHandle.getContext('2d') && !!this.canvasHandle.getContext('2d');
    }

    /**
     * Get the 2D buffer context.
     * @returns 
     */
    public getBufferContext(): CanvasRenderingContext2D | null {
        return this.bufferHandle.getContext('2d');
    }

    /**
     * Get the 2D canvas context.
     * @returns 
     */
    public getCanvasContext(): CanvasRenderingContext2D | null {
        return this.canvasHandle.getContext('2d');
    }

    /**
     * Get the buffer canvas element.
     * @returns 
     */
    public getBuffer(): HTMLCanvasElement {
        return this.bufferHandle;
    }
}