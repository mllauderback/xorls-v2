import type { AfterViewInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Component, DestroyRef, ElementRef, EventEmitter, HostListener, inject, Input, NgZone, Output, ViewChild } from '@angular/core';
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
import { isIOComponent, isPlaceable } from '../../../../models/components/ComponentFactory';
import type { Selectable } from '../../../../models/Selectable';
import type { Point } from '../../../../models/Point';

// Matches the grid layer's default spacing
const DEFAULT_GRID_SPACING = 20;

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

@Component({
    selector: 'app-diagram-workspace-presenter',
    imports: [GridCanvasLayerComponent, ComponentCanvasLayerComponent, IOCanvasLayerComponent, WireCanvasLayerComponent, ActiveComponentCanvasLayerComponent, ActiveWireCanvasLayerComponent],
    templateUrl: './diagram-workspace.presenter.component.html',
    styleUrl: './diagram-workspace.presenter.component.scss',
})
export class DiagramWorkspacePresenterComponent implements AfterViewInit, OnChanges, OnDestroy {
    private renderService = inject(RenderService);
    private host = inject<ElementRef<HTMLElement>>(ElementRef);
    private pointerService = inject(PointerService);
    private ngZone = inject(NgZone);
    private keyboardService = inject(KeyboardService);
    private destroyRef = inject(DestroyRef);

    @Input({ required: true }) id!: string;
    @Input({ required: true }) workspaceSettings!: WorkspaceSettingsState | null;
    @Input({ required: true }) workspaceState!: DiagramWorkspaceState | CodeWorkspaceState | null; // null would be if no workspaces are open
    /** The app-wide selection. A ghost selectable is previewed here until it is placed. */
    @Input() selectedSelectable: SelectedSelectable | null = null;

    /** Emits once the previewed ghost has been placed in this workspace. */
    @Output() componentPlaced = new EventEmitter<void>();

    /** Emits when Esc is pressed while this workspace is the one shown: the user wants to deselect or cancel the placement. */
    @Output() selectionCleared = new EventEmitter<void>();

    @ViewChild('grid') gridCanvasLayerComponent!: GridCanvasLayerComponent;
    @ViewChild('component') componentCanvasLayerComponent!: ComponentCanvasLayerComponent;
    @ViewChild('activeComponent') activeComponentCanvasLayerComponent!: ActiveComponentCanvasLayerComponent;
    @ViewChild('io') ioCanvasLayerComponent!: IOCanvasLayerComponent;
    @ViewChild('wire') wireCanvasLayerComponent!: WireCanvasLayerComponent;
    @ViewChild('activeWire') activeWireCanvasLayerComponent!: ActiveWireCanvasLayerComponent;

    /** The selectable currently previewed in this workspace, if any. Not in app state: it only affects how it's drawn. */
    private ghost: Placeable | null = null;
    /** The last pointer position (client coordinates) seen over this workspace. */
    private lastPointer: Point | null = null;

    constructor() {
        // Only the pointer over this workspace counts. The service delivers events outside the Angular zone, which
        // is right for moves (they fire at display rate), but a click ends in a store update, so it re-enters the zone.
        const pointer = this.pointerService.within(this.host.nativeElement);
        pointer.move$.pipe(takeUntilDestroyed()).subscribe(({ event }) => this.onMouseMove(event));
        pointer.click$.pipe(takeUntilDestroyed()).subscribe(({ event }) => this.ngZone.run(() => this.onMouseClick(event)));

        this.keyboardService.on('Escape', () => this.onEscape(), { enabled: () => this.isActive(), destroyRef: this.destroyRef });
    }

    ngOnChanges(changes: SimpleChanges): void {
        const change = changes['selectedSelectable'];
        if (!change) return;
        const previous: Selectable | null = change.previousValue?.selectable ?? null;
        const current: Selectable | null = change.currentValue?.selectable ?? null;
        if (previous === current) return;
        if (previous) this.releaseSelectable(previous);
        if (current) this.beginPreview(current);
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
        if (!this.ghost && !this.selectedSelectable?.selectable) return false;
        this.selectionCleared.emit();
        return true;
    }

    /** Whether this workspace is the one currently shown. Every open workspace is listening to the mouse. */
    private isActive(): boolean {
        return this.renderService.activeId === this.id;
    }

    /**
     * A selectable stopped being the selected one.
     * A ghost that was never placed is discarded. A placed component moves from the active layer back to its regular layer.
     */
    private releaseSelectable(previous: Selectable) {
        if (!isPlaceable(previous)) return;
        if (this.ghost === previous) this.ghost = null;

        const activeLayer = this.activeComponentCanvasLayerComponent;
        if (!activeLayer?.getDrawableList().includes(previous)) return; // belongs to another workspace, or was never added
        activeLayer.removeDrawable(previous);
        activeLayer.redrawAll();

        if (!previous.isGhost) {
            const layer = isIOComponent(previous) ? this.ioCanvasLayerComponent : this.componentCanvasLayerComponent;
            layer.add(previous);
            layer.redrawAll();
        }
    }

    /** A new selectable was selected. If it's a ghost, preview it here as long as this is the workspace being shown. */
    private beginPreview(current: Selectable) {
        if (!isPlaceable(current) || !current.isGhost || !this.isActive()) return;
        this.ghost = current;
        // Without a pointer position there's nowhere sensible to draw it yet. It is added on the first mouse move.
        if (this.lastPointer) this.moveGhostTo(this.lastPointer);
    }

    /**
     * Wired to the pointer's move$ over this workspace. Runs outside the Angular zone.
     * The ghost follows the pointer, snapped to the grid.
     */
    private onMouseMove(event: MouseEvent) {
        if (!this.isActive()) return;
        this.lastPointer = { x: event.clientX, y: event.clientY };
        if (this.ghost) this.moveGhostTo(this.lastPointer);
    }

    /** Wired to the pointer's click$ over this workspace. A left click places the ghost where it is previewed. */
    private onMouseClick(event: MouseEvent) {
        if (event.button !== 0 || !this.isActive() || !this.ghost) return;
        // a click without a preceding move (touch, for example) still needs to land where it was clicked
        this.moveGhostTo({ x: event.clientX, y: event.clientY });

        // Stays selected and stays on the active layer. Selecting something else is what releases it.
        this.ghost.isGhost = false;
        this.activeComponentCanvasLayerComponent.redrawAll();
        this.ghost = null;
        this.componentPlaced.emit();
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