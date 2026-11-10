import type { AfterViewInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Component, DestroyRef, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { CodeWorkspaceState, DiagramWorkspaceState } from '../../../../store/workspace/state';
import type { SelectedSelectable } from '../../../../store/components/state';
import { GridCanvasLayerComponent } from "../../../canvas-layers/grid-canvas-layer/grid-canvas-layer.component";
import { ComponentCanvasLayerComponent } from "../../../canvas-layers/component-canvas-layer/component-canvas-layer.component";
import { IOCanvasLayerComponent } from "../../../canvas-layers/io-canvas-layer/io-canvas-layer.component";
import { WireCanvasLayerComponent } from "../../../canvas-layers/wire-canvas-layer/wire-canvas-layer.component";
import { ActiveComponentCanvasLayerComponent } from "../../../canvas-layers/active-component-canvas-layer/active-component-canvas-layer.component";
import { ActiveWireCanvasLayerComponent } from "../../../canvas-layers/active-wire-canvas-layer/active-wire-canvas-layer.component";
import { RenderService } from '../../../../services/render/render.service';
import type { AbstractCanvasLayerComponent } from '../../../canvas-layers/abstract-canvas-layer.component';
import { PointerService } from '../../../../services/pointer/pointer.service';
import { KeyboardService } from '../../../../services/keyboard/keyboard.service';
import type { Placeable } from '../../../../models/components/ComponentFactory';
import { createPlaceable, isIOComponent } from '../../../../models/components/ComponentFactory';
import type { PaletteComponent } from '../../../../models/components/PaletteComponent';
import type { Point } from '../../../../models/Point';

// Matches the grid layer's default spacing
const DEFAULT_GRID_SPACING = 20;

@Component({
    selector: 'app-diagram-workspace-presenter',
    imports: [GridCanvasLayerComponent, ComponentCanvasLayerComponent, IOCanvasLayerComponent, WireCanvasLayerComponent, ActiveComponentCanvasLayerComponent, ActiveWireCanvasLayerComponent],
    templateUrl: './diagram-workspace.presenter.component.html',
    styles: `:host { display: block; width: 100%; height: 100%; }`
})
export class DiagramWorkspacePresenterComponent implements AfterViewInit, OnChanges, OnDestroy {
    private renderService = inject(RenderService);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    private pointerService = inject(PointerService);
    private keyboardService = inject(KeyboardService);
    private destroyRef = inject(DestroyRef);

    @Input({ required: true }) id!: string;
    @Input({ required: true }) workspaceSettings!: WorkspaceSettingsState | null;
    @Input({ required: true }) workspaceState!: DiagramWorkspaceState | CodeWorkspaceState | null; // null would be if no workspaces are open
    /** The highlighted palette component waiting to be placed. */
    @Input() selectedPaletteComponent: PaletteComponent | null = null;
    /** The selected component that was already placed. It is a reference by id: the component itself isn't in the store. */
    @Input() selectedSelectable: SelectedSelectable | null = null;

    /** Emits when Esc is pressed while this workspace is the one shown: the user wants to deselect or cancel the placement. */
    @Output() selectionCleared = new EventEmitter<void>();

    @ViewChild('grid') gridCanvasLayerComponent!: GridCanvasLayerComponent;
    @ViewChild('component') componentCanvasLayerComponent!: ComponentCanvasLayerComponent;
    @ViewChild('activeComponent') activeComponentCanvasLayerComponent!: ActiveComponentCanvasLayerComponent;
    @ViewChild('io') ioCanvasLayerComponent!: IOCanvasLayerComponent;
    @ViewChild('wire') wireCanvasLayerComponent!: WireCanvasLayerComponent;
    @ViewChild('activeWire') activeWireCanvasLayerComponent!: ActiveWireCanvasLayerComponent;

    /** The preview of the palette component being placed, if any. Not in app state: it only affects how it's drawn. */
    private ghost: Placeable | null = null;
    /** The last pointer position (client coordinates) seen over this workspace. */
    private lastPointer: Point | null = null;
    private panning = false;

    constructor() {
        // All mouse handling for a workspace lives here. Only the pointer over this workspace counts. The service
        // delivers events outside the Angular zone, which is right while nothing here reaches the store: it's all
        // canvas drawing. Whatever ends up dispatching an action has to re-enter the zone.
        const pointer = this.pointerService.within(this.host.nativeElement);
        pointer.move$.pipe(takeUntilDestroyed()).subscribe(({ event }) => this.onMouseMove(event));
        pointer.click$.pipe(takeUntilDestroyed()).subscribe(({ event }) => this.onMouseClick(event));
        pointer.drag$.pipe(takeUntilDestroyed()).subscribe(({ event }) => this.onMouseDrag(event));
        // releasing ends the grab wherever the pointer is, even if the drag left the workspace
        this.pointerService.up$.pipe(takeUntilDestroyed()).subscribe(() => this.onMouseUp());

        this.keyboardService.on('Escape', () => this.onEscape(), { enabled: () => this.isActive(), destroyRef: this.destroyRef });
    }

    ngOnChanges(changes: SimpleChanges): void {
        const change = changes['selectedPaletteComponent'];
        if (!change) return;
        const previous: string | null = change.previousValue?.className ?? null;
        const current: string | null = change.currentValue?.className ?? null;
        if (previous === current) return;

        this.discardGhost();
        if (current && this.ensureGhost() && this.lastPointer) this.moveGhostTo(this.lastPointer);
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
    }

    ngOnDestroy(): void {
        this.renderService.remove(this.id);
    }

    private onEscape(): boolean {
        if (!this.selectedPaletteComponent && !this.selectedSelectable) return false;
        this.selectionCleared.emit();
        return true;
    }

    /** Whether this workspace is the one currently shown. Every open workspace is listening to the mouse. */
    private isActive(): boolean {
        return this.renderService.activeId === this.id;
    }

    /**
     * Makes the ghost for the selected palette component, if there should be one: a component is waiting to be placed
     * and this is the workspace being shown. A workspace that isn't being shown has no ghost, so one is made on the
     * first mouse move after the user switches to it.
     *
     * @returns The ghost, or null if there shouldn't be one
     */
    private ensureGhost(): Placeable | null {
        const className = this.selectedPaletteComponent?.className;
        if (!this.ghost && className && this.isActive()) {
            // The position is set from the pointer, as soon as there is one. It is added to the layer then.
            this.ghost = createPlaceable(className, { x: 0, y: 0 });
            this.ghost.isGhost = true;
        }
        return this.ghost;
    }

    /** Removes the ghost, if there is one, because nothing is waiting to be placed anymore. */
    private discardGhost() {
        const ghost = this.ghost;
        this.ghost = null;
        const layer = this.activeComponentCanvasLayerComponent;
        if (!ghost || !layer?.getDrawableList().includes(ghost)) return; // it was never positioned, so never drawn
        layer.removeDrawable(ghost);
        layer.redrawAll();
    }

    /**
     * Wired to the pointer's move$ over this workspace. Runs outside the Angular zone.
     * The ghost follows the pointer, snapped to the grid.
     */
    private onMouseMove(event: MouseEvent) {
        if (!this.isActive()) return;
        this.lastPointer = { x: event.clientX, y: event.clientY };
        if (this.ensureGhost()) this.moveGhostTo(this.lastPointer);
    }

    /**
     * Wired to the pointer's click$ over this workspace. Runs outside the Angular zone.
     * A left click places the previewed component where it is previewed: it becomes a regular component of the
     * diagram, on its normal layer. The palette component stays selected, so a new ghost takes its place.
     */
    private onMouseClick(event: MouseEvent) {
        if (event.button !== 0 || !this.isActive() || !this.ensureGhost()) return;
        const pointer = { x: event.clientX, y: event.clientY };
        // a click without a preceding move (touch, for example) still needs to land where it was clicked
        this.moveGhostTo(pointer);

        const placed = this.ghost!;
        this.ghost = null;
        placed.isGhost = false;
        const activeLayer = this.activeComponentCanvasLayerComponent;
        activeLayer.removeDrawable(placed);
        activeLayer.redrawAll();
        const layer = isIOComponent(placed) ? this.ioCanvasLayerComponent : this.componentCanvasLayerComponent;
        layer.add(placed);
        layer.redrawAll();

        if (this.ensureGhost()) this.moveGhostTo(pointer);
    }

    /**
     * Wired to the pointer's drag$ over this workspace. Runs outside the Angular zone.
     * Dragging pans the diagram.
     */
    private onMouseDrag(event: MouseEvent) {
        if (!this.isActive()) return;
        const host = this.host.nativeElement;
        this.renderService.panActiveDiagram(event.movementX, event.movementY, host.clientWidth, host.clientHeight);
        // eventually link mouse mode to a cursor style using the store
        this.panning = true;
        host.style.cursor = 'grabbing';
    }

    /** Wired to the pointer service's up$. Ends a pan. */
    private onMouseUp() {
        if (!this.panning) return;
        this.panning = false;
        this.host.nativeElement.style.cursor = 'default';
    }

    /**
     * Moves the ghost so that the pointer is at the middle of its bounding box, snapped to the grid.
     * The ghost is added to the active component layer the first time it is positioned.
     * @param pointer Pointer position in client coordinates
     */
    private moveGhostTo(pointer: Point) {
        const ghost = this.ghost;
        const layer = this.activeComponentCanvasLayerComponent;
        const cursor = this.clientToDiagram(pointer);
        if (!ghost || !layer || !cursor) return;

        const box = ghost.getBoundingBox();
        const position = this.snapToGrid({
            x: cursor.x - (box.x + box.width / 2),
            y: cursor.y - (box.y + box.height / 2)
        });

        const isOnLayer = layer.getDrawableList().includes(ghost);
        if (isOnLayer && position.x === ghost.position.x && position.y === ghost.position.y) return;
        ghost.position = position;
        if (!isOnLayer) layer.add(ghost);
        layer.redrawAll();
    }

    /**
     * Converts a pointer position to diagram coordinates, i.e. relative to the diagram origin.
     * This undoes how drawables reach the screen: drawable position + draw state origin = position on the
     * offscreen canvas, and the offscreen canvas is painted at the layer's viewport offset.
     */
    private clientToDiagram(pointer: Point): Point | null {
        const layer = this.activeComponentCanvasLayerComponent;
        const rect = layer?.getClientRect();
        const drawState = this.renderService.activeDrawState;
        if (!rect || !drawState) return null;
        return {
            x: pointer.x - rect.left - layer.viewportOffset.x - drawState.origin.x,
            y: pointer.y - rect.top - layer.viewportOffset.y - drawState.origin.y
        };
    }

    /**
     * Snaps a diagram position to the nearest grid point on the canvas
     */
    private snapToGrid(position: Point): Point {
        const origin = this.renderService.activeDrawState?.origin ?? { x: 0, y: 0 };
        const spacing = this.workspaceSettings?.gridSettings?.gridSpacing || DEFAULT_GRID_SPACING;
        const snap = (value: number, offset: number) => Math.round((value + offset) / spacing) * spacing - offset;
        return { x: snap(position.x, origin.x), y: snap(position.y, origin.y) };
    }
}