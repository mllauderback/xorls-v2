import type { AfterViewInit, OnDestroy } from '@angular/core';
import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { CodeWorkspaceState, DiagramWorkspaceState } from '../../../../store/workspace/state';
import { GridCanvasLayerComponent } from "../../../canvas-layers/grid-canvas-layer/grid-canvas-layer.component";
import { ComponentCanvasLayerComponent } from "../../../canvas-layers/component-canvas-layer/component-canvas-layer.component";
import { IOCanvasLayerComponent } from "../../../canvas-layers/io-canvas-layer/io-canvas-layer.component";
import { WireCanvasLayerComponent } from "../../../canvas-layers/wire-canvas-layer/wire-canvas-layer.component";
import { ActiveComponentCanvasLayerComponent } from "../../../canvas-layers/active-component-canvas-layer/active-component-canvas-layer.component";
import { ActiveWireCanvasLayerComponent } from "../../../canvas-layers/active-wire-canvas-layer/active-wire-canvas-layer.component";
import { RenderService } from '../../../../services/render/render.service';
import type { AbstractCanvasLayerComponent } from '../../../canvas-layers/abstract-canvas-layer.component';
import type { Placeable } from '../../../../models/components/ComponentFactory';
import { isIOComponent } from '../../../../models/components/ComponentFactory';
import type { Drawable } from '../../../../models/Drawable';
import type { Point } from '../../../../models/Point';
import type { DiagramView } from '../controller/diagram-view';

/**
 * Shows a diagram on a stack of canvas layers and does nothing else. It doesn't listen to the mouse or the keyboard,
 * doesn't know what is selected and doesn't decide anything: the diagram controller does all of that, through
 * DiagramView, which is what this implements. viewReady hands the controller this view once the layers exist.
 */
@Component({
    selector: 'app-diagram-workspace-presenter',
    imports: [GridCanvasLayerComponent, ComponentCanvasLayerComponent, IOCanvasLayerComponent, WireCanvasLayerComponent, ActiveComponentCanvasLayerComponent, ActiveWireCanvasLayerComponent],
    templateUrl: './diagram-workspace.presenter.component.html',
    styles: `:host { display: block; width: 100%; height: 100%; }`
})
export class DiagramWorkspacePresenterComponent implements DiagramView, AfterViewInit, OnDestroy {
    private renderService = inject(RenderService);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);

    @Input({ required: true }) id!: string;
    @Input({ required: true }) workspaceSettings!: WorkspaceSettingsState | null;
    @Input({ required: true }) workspaceState!: DiagramWorkspaceState | CodeWorkspaceState | null; // null would be if no workspaces are open

    /** Emits this view once its layers exist and are registered for rendering, so something can start controlling it. */
    @Output() viewReady = new EventEmitter<DiagramView>();

    @ViewChild('grid') gridCanvasLayerComponent!: GridCanvasLayerComponent;
    @ViewChild('component') componentCanvasLayerComponent!: ComponentCanvasLayerComponent;
    @ViewChild('activeComponent') activeComponentCanvasLayerComponent!: ActiveComponentCanvasLayerComponent;
    @ViewChild('io') ioCanvasLayerComponent!: IOCanvasLayerComponent;
    @ViewChild('wire') wireCanvasLayerComponent!: WireCanvasLayerComponent;
    @ViewChild('activeWire') activeWireCanvasLayerComponent!: ActiveWireCanvasLayerComponent;

    get element(): HTMLElement {
        return this.host.nativeElement;
    }

    ngAfterViewInit(): void {
        const layers: AbstractCanvasLayerComponent[] = [
            this.gridCanvasLayerComponent,
            this.componentCanvasLayerComponent,
            this.ioCanvasLayerComponent,
            this.wireCanvasLayerComponent,
            this.activeComponentCanvasLayerComponent,
            this.activeWireCanvasLayerComponent
        ];
        this.renderService.add(this.id, layers);
        console.log(`view inited for ${this.id}`);
        this.viewReady.emit(this);
    }

    ngOnDestroy(): void {
        this.renderService.remove(this.id);
    }

    /**
     * Undoes how drawables reach the screen: drawable position + draw state origin = position on the offscreen
     * canvas, and the offscreen canvas is painted at the layer's viewport offset.
     */
    clientToDiagram(client: Point): Point | null {
        const layer = this.activeComponentCanvasLayerComponent;
        const rect = layer?.getClientRect();
        const drawState = this.renderService.activeDrawState;
        if (!rect || !drawState) return null;
        return {
            x: client.x - rect.left - layer.viewportOffset.x - drawState.origin.x,
            y: client.y - rect.top - layer.viewportOffset.y - drawState.origin.y
        };
    }

    isPreviewing(drawable: Drawable): boolean {
        return !!this.activeComponentCanvasLayerComponent?.getDrawableList().includes(drawable);
    }

    /** Previews go on the active component layer, which is drawn above the regular ones. */
    showPreview(drawable: Drawable): void {
        const layer = this.activeComponentCanvasLayerComponent;
        if (!layer) return;
        if (!this.isPreviewing(drawable)) layer.add(drawable);
        layer.redrawAll();
    }

    hidePreview(drawable: Drawable): void {
        const layer = this.activeComponentCanvasLayerComponent;
        if (!layer || !this.isPreviewing(drawable)) return; // it was never shown
        layer.removeDrawable(drawable);
        layer.redrawAll();
    }

    place(placed: Placeable): void {
        const layer = isIOComponent(placed) ? this.ioCanvasLayerComponent : this.componentCanvasLayerComponent;
        layer.add(placed);
        layer.redrawAll();
    }

    setCursor(cursor: string): void {
        this.element.style.cursor = cursor;
    }
}
