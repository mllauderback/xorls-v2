import { Injectable } from '@angular/core';
import { DrawState } from '../../models/Drawable';
import { AbstractCanvasLayerComponent } from '../../components/canvas-layers/abstract-canvas-layer.component';

/**
 * The RenderService tracks shared variables across all layers like the origin and scale.
 * Any layer transformations are done through the RenderService API.
 */
@Injectable({
    providedIn: 'root'
})
export class RenderService {
    public readonly THIN_LINE_WIDTH = 1;
    public readonly STANDARD_LINE_WIDTH = 2;
    public readonly BOLD_LINE_WIDTH = 4;

    private drawState: DrawState = {
        origin: { x: 0, y: 0 },
        scale: 1.0
    };
    private lastTimestamp: number = 0;
    private readonly targetFPS: number = 30;
    private animationId: number | null = null;
    private layers: AbstractCanvasLayerComponent[] = [];
    private _width: number = 0;
    private _height: number = 0;

    constructor() {}

    private set width(width: number) {
        this._width = width;
    }

    public get width() {
        return this._width;
    }

    private set height(height: number) {
        this._height = height;
    }

    public get height() {
        return this._height;
    }

    /**
     * Adds a layer to the list of layers to render
     * @param layer The layer to add
     * @returns The updated render service
     */
    public add(layer: AbstractCanvasLayerComponent): RenderService {
        this.layers.push(layer);
        return this;
    }

    /**
     * Removes a layer from the list of layers to render
     * @param layer The layer to remove
     * @returns The updated render service
     */
    public remove(layer: AbstractCanvasLayerComponent): RenderService {
        this.layers = this.layers.filter(d => d !== layer);
        return this;
    }

    /**
     * Starts the main draw loop for all layers
     */
    public start() {
        const interval = 1000 / this.targetFPS;
        const dpr = window.devicePixelRatio || 1;
        this.layers.forEach(layer => {
            if (layer.context === null || layer.context === undefined) {
                console.warn('At least 1 layer context is null or undefined.  Skipping.');
                return;
            }
            layer.context.scale(dpr, dpr);
        });
        const drawLoop = (timestamp: number) => {
            const elapsedTime = timestamp - this.lastTimestamp;
            this.animationId = requestAnimationFrame(drawLoop);
            if (elapsedTime >= interval) {
                this.lastTimestamp = timestamp - (elapsedTime % interval);
                // Possibly consider storing each promise in a layer-promise map with the current promise and the 
                // most recent promise.  This way, the current promise is allowed to finish if it takes longer than
                // the FPS interval, but the next promise to await will always be from the most recent refresh,
                // preventing a long queue of potentially very very heavy refreshes.  This would result in 
                // "jumping" in the animation, but layer will be at the most up-to-date state possible intead of
                // trying to draw every missed frame which might appear smoother, but will be much laggier.
                this.layers.forEach(layer => layer.refresh(this.drawState));
            }
        };
        this.animationId = requestAnimationFrame(drawLoop);
    }

    /**
     * Stops the draw loop
     */
    public stop() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Updates the draw state scale by offset which affects all layers
     */
    public scale(offset: number) {
        this.drawState.scale += offset;
    }

    /**
     * Updates the width and height of all layers
     */
    public resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.layers.forEach(l => {
            l.resize(this.width, this.height);
            // setting canvas width/height automatically clear the canvas
            // so we need to force a refresh now to prevent flickering
            // due to the canvas being blank until the next draw loop cycle.
            l.refresh(this.drawState);
        });
    }
}
