import { Injectable } from '@angular/core';
import type { DrawState } from '../../models/Drawable';
import type { AbstractCanvasLayerComponent } from '../../components/canvas-layers/abstract-canvas-layer.component';

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
    private lastTimestamp = 0;
    private readonly targetFPS: number = 30;
    private animationId: number | null = null;
    private diagramsCanvasLayerMap = new Map<string, AbstractCanvasLayerComponent[]>();
    private activeLayers: AbstractCanvasLayerComponent[] = [];
    private _activeId = "";

    /**
     * Set the active diagram id.
     */
    public set activeId(id: string) {
        this.activeLayers = (this.diagramsCanvasLayerMap.get(id)) ?? [];
        if (!this.diagramsCanvasLayerMap.has(id)) {
            console.warn(`id ${id} not registered in render service.`);
        }
        this._activeId = id;
    }

    /**
     * The active diagram id
     */
    public get activeId() {
        return this._activeId;
    }

    /**
     * Returns the layer height of the active diagram.
     * If the active diagram ID doesn't exist in the map, returns -1
     * @returns height of the active layers
     */
    public getActiveDiagramHeight(): number {
        if (!this.diagramsCanvasLayerMap.has(this._activeId)) return -1;
        return this.diagramsCanvasLayerMap.get(this._activeId)![0].height;
    }

    /**
     * Returns the layer widths of the active diagram.
     * If the active diagram ID doesn't exist in the map, returns -1
     * @returns width of the active layers
     */
    public getActiveDiagramWidth(): number {
        if (!this.diagramsCanvasLayerMap.has(this._activeId)) return -1;
        return this.diagramsCanvasLayerMap.get(this._activeId)![0].width;
    }

    /**
     * Adds layers to the list of layers to render for a diagram id
     * @param layers The list of layers to add
     * @param id The unique id string of the diagram
     * @returns The updated render service
     */
    public add(id: string, layers: AbstractCanvasLayerComponent[]): RenderService {
        this.diagramsCanvasLayerMap.set(id, layers);
        return this;
    }

    /**
     * Removes a diagram from the list of diagrams to render
     * @param id The unique id string of the diagram to remove
     * @returns The updated render service
     */
    public remove(id: string): RenderService {
        const success = this.diagramsCanvasLayerMap.delete(id);
        if (!success) console.warn(`Diagram with id ${id} does not exist.`);
        return this;
    }

    /**
     * Starts the main draw loop for the the active diagram
     */
    public start() {
        const interval = 1000 / this.targetFPS;
        const dpr = window.devicePixelRatio || 1;
        this.activeLayers.forEach(layer => {
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
                this.activeLayers.forEach(layer => layer.refresh(this.drawState));
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
    public scaleActiveDiagram(offset: number) {
        this.drawState.scale += offset;
    }

    /**
     * Updates the width and height of all layers in the active diagram
     */
    public resizeActiveDiagram(width: number, height: number) {
        this.activeLayers.forEach(l => {
            l.resize(width, height);
            // setting canvas width/height automatically clear the canvas
            // so we need to force a refresh now to prevent flickering
            // due to the canvas being blank until the next draw loop cycle.
            l.refresh(this.drawState);
        });
    }
}
