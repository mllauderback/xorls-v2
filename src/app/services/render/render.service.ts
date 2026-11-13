import { Injectable } from '@angular/core';
import type { Drawable, DrawState } from '../../models/Drawable';
import { isGhostable } from '../../models/Ghostable';
import type { AbstractCanvasLayerComponent } from '../../components/canvas-layers/abstract-canvas-layer.component';
import { ViewTransform } from './view-transform';

/**
 * The RenderService tracks shared variables across all layers like the origin and scale, as one ViewTransform per
 * diagram. Any layer transformations are done through the RenderService API; layers pick up changes to the view
 * transform by comparing its version when they refresh.
 */
@Injectable({
    providedIn: 'root'
})
export class RenderService {
    public readonly THIN_LINE_WIDTH = 1;
    public readonly STANDARD_LINE_WIDTH = 2;
    public readonly BOLD_LINE_WIDTH = 3;

    /**
     * Ghosts (previews of something that hasn't been placed yet) are drawn lighter than everything else.
     * This style takes precedence over a layer's own style, e.g. the active layer's "selected" style,
     * because being a ghost implies being selected.
     */
    public readonly GHOST_STROKE_STYLE = 'gray';
    public readonly GHOST_ALPHA = 0.5;

    private lastTimestamp = 0;
    private readonly targetFPS: number = 60;
    private animationId: number | null = null;
    private diagramsCanvasLayerMap = new Map<string, AbstractCanvasLayerComponent[]>();
    private viewTransforms = new Map<string, ViewTransform>();
    private activeLayers: AbstractCanvasLayerComponent[] = [];
    private _activeViewTransform: ViewTransform | null = null;
    private _activeId = "";

    public getActiveDiagram() {
        return this.diagramsCanvasLayerMap.get(this._activeId)!;
    }

    /** The view transform of the active diagram, or null when no registered diagram is active. */
    public get activeViewTransform(): ViewTransform | null {
        return this._activeViewTransform;
    }

    /**
     * Set the active diagram id.
     */
    public set activeId(id: string) {
        this.activeLayers = (this.diagramsCanvasLayerMap.get(id)) ?? [];
        this._activeViewTransform = this.viewTransforms.get(id) ?? null;
        if (!this.diagramsCanvasLayerMap.has(id)) {
            console.warn(`layer id ${id} not registered in render service.`);
        }
        if (!this.viewTransforms.has(id)) {
            console.warn(`view transform for id ${id} not registered in render service`);
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
        this.viewTransforms.set(id, new ViewTransform());
        return this;
    }

    /**
     * Removes a diagram from the list of diagrams to render
     * @param id The unique id string of the diagram to remove
     * @returns The updated render service
     */
    public remove(id: string): RenderService {
        let success = this.diagramsCanvasLayerMap.delete(id);
        if (!success) console.warn(`Diagram with id ${id} does not exist.`);
        success = this.viewTransforms.delete(id);
        if (!success) console.warn(`View transform with id ${id} does not exist`);
        return this;
    }

    /**
     * Draws drawables onto a layer's context, drawing ghosts in the ghost style instead of the layer's style.
     * Non-ghost drawables share one path and one stroke; ghosts share another.
     *
     * @param ctx The context to draw on
     * @param drawables The drawables to draw
     * @param drawState Global draw state information
     * @param style The layer's stroke style and line width for non-ghost drawables
     */
    public drawDrawables(
        ctx: OffscreenCanvasRenderingContext2D,
        drawables: Drawable[],
        drawState: DrawState,
        style: { strokeStyle: string, lineWidth: number }
    ) {
        const solids = drawables.filter(d => !(isGhostable(d) && d.isGhost));
        const ghosts = drawables.filter(d => isGhostable(d) && d.isGhost);
        this.strokeDrawables(ctx, solids, drawState, style.strokeStyle, style.lineWidth, 1);
        this.strokeDrawables(ctx, ghosts, drawState, this.GHOST_STROKE_STYLE, style.lineWidth, this.GHOST_ALPHA);
    }

    private strokeDrawables(
        ctx: OffscreenCanvasRenderingContext2D,
        drawables: Drawable[],
        drawState: DrawState,
        strokeStyle: string,
        lineWidth: number,
        alpha: number
    ) {
        if (drawables.length === 0) return;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        drawables.forEach(d => d.draw(ctx, drawState));
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    /**
     * Starts the main draw loop for the the active diagram
     */
    public start() {
        if (this.animationId !== null) return;
        const interval = 1000 / this.targetFPS;
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
                this.activeLayers.forEach(layer => layer.refresh(this._activeViewTransform!));
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
        this._activeViewTransform!.setScale(this._activeViewTransform!.scale + offset);
    }

    /**
     * Updates the width and height of all layers in the active diagram
     */
    public resizeActiveDiagram(width: number, height: number) {
        this.activeLayers.forEach(l => {
            this.resizeLayer(l, width, height);
        });
    }

    public resizeLayer(layer: AbstractCanvasLayerComponent, width: number, height: number) {
        layer.resize(width, height);
        // setting canvas width/height automatically clear the canvas
        // so we need to force a refresh now to prevent flickering
        // due to the canvas being blank until the next draw loop cycle.
        layer.refresh(this._activeViewTransform!);
    }

    public panActiveDiagram(dx: number, dy: number, viewportWidth: number, viewportHeight: number) {
        // translate and repaint
        this.activeLayers.forEach(l => {
            l.shiftViewportOffsetBy(dx, dy);
        });

        // compute layer growth if canvas edge appears inside the viewport
        // grow by 500 pixels to minimize redraws during panning.
        const { growLeft, growTop, growRight, growBottom } = this.activeLayers.reduce((acc, l) => ({
            growLeft: l.viewportOffset.x > 0 ? 500 : acc.growLeft,
            growTop: l.viewportOffset.y > 0 ? 500 : acc.growTop,
            growRight: l.width + l.viewportOffset.x < viewportWidth ? 500 : acc.growRight,
            growBottom: l.height + l.viewportOffset.y < viewportHeight ? 500 : acc.growBottom,
        }), { growLeft: 0, growTop: 0, growRight: 0, growBottom: 0 });

        if (!growLeft && !growTop && !growRight && !growBottom) return;

        // the diagram moves right/down on the grown canvas by as much as it grew left/up
        this._activeViewTransform!.shiftOrigin(growLeft, growTop);

        // apply layer resize, optional offset adjustment, and redraw
        this.activeLayers.forEach(l => {
            if (growLeft) l.shiftViewportOffsetBy(-growLeft, 0);
            if (growTop) l.shiftViewportOffsetBy(0, -growTop);
            this.resizeLayer(l, l.width + growLeft + growRight, l.height + growTop + growBottom);
        });
    }
}
