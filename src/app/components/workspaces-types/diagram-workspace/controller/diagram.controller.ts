import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { SelectedSelectable } from '../../../../store/components/state';
import { RenderService } from '../../../../services/render/render.service';
import { PointerService } from '../../../../services/pointer/pointer.service';
import { KeyboardService } from '../../../../services/keyboard/keyboard.service';
import type { Placeable } from '../../../../models/components/ComponentFactory';
import { createPlaceable } from '../../../../models/components/ComponentFactory';
import type { PaletteComponent } from '../../../../models/components/PaletteComponent';
import type { Point } from '../../../../models/Point';
import type { DiagramView } from './diagram-view';

// Matches the grid layer's default spacing
const DEFAULT_GRID_SPACING = 20;

/**
 * Handles what the user does in one diagram workspace: it follows the mouse and the keyboard, and decides what that
 * means. Moving the mouse previews the palette component that is waiting to be placed, a click places it, a drag pans
 * the diagram, and Esc cancels.
 *
 * It sits between the container and the presenter. The container tells it what the store holds (which palette
 * component is selected, the workspace settings) and acts on what it reports (the user cleared the selection). The
 * presenter is its view: the controller says what to show through DiagramView and never touches a canvas itself.
 * It doesn't use the store, so it can be tested with a stand-in view.
 *
 * Provide it where the workspace is made, so there is one for each workspace, and call attach() once the view exists.
 * It stops listening when what provides it is destroyed.
 *
 * Mouse events arrive outside the Angular zone, because moves and drags fire at display rate and only draw on a
 * canvas. Keys arrive inside it, so selectionCleared$ can lead to a store update.
 */
@Injectable()
export class DiagramController {
    private renderService = inject(RenderService);
    private pointerService = inject(PointerService);
    private keyboardService = inject(KeyboardService);
    private destroyRef = inject(DestroyRef);

    /** Emits when the user pressed Esc to deselect a component or cancel a placement, while this workspace is the one shown. */
    readonly selectionCleared$ = new Subject<void>();

    private view: DiagramView | null = null;
    private workspaceId = '';

    private paletteComponent: PaletteComponent | null = null;
    private selectedSelectable: SelectedSelectable | null = null;
    private gridSpacing = DEFAULT_GRID_SPACING;

    /** The preview of the palette component being placed, if any. Not in app state: it only affects how it's drawn. */
    private ghost: Placeable | null = null;
    /** The last pointer position (client coordinates) seen over the workspace. */
    private lastPointer: Point | null = null;
    private panning = false;

    /**
     * Starts controlling a view. Everything the controller was told before this is applied.
     *
     * @param view What to control
     * @param workspaceId The id of the workspace, to tell whether it is the one being shown
     * @throws If it is already controlling a view
     */
    attach(view: DiagramView, workspaceId: string): void {
        if (this.view) throw new Error('The diagram controller is already attached to a view.');
        this.view = view;
        this.workspaceId = workspaceId;

        // Only the pointer over this workspace counts.
        const pointer = this.pointerService.within(view.element);
        pointer.move$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ event }) => this.onMouseMove(event));
        pointer.click$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ event }) => this.onMouseClick(event));
        pointer.drag$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ event }) => this.onMouseDrag(event));
        // releasing ends the grab wherever the pointer is, even if the drag left the workspace
        this.pointerService.up$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.onMouseUp());

        // Every open workspace registers this, but only the one being shown handles it.
        this.keyboardService.on('Escape', () => this.onEscape(), { enabled: () => this.isActive(), destroyRef: this.destroyRef });

        this.ensureGhost();
    }

    /**
     * Tells the controller which palette component is waiting to be placed, or null when none is. While there is one,
     * a ghost of it follows the mouse in the workspace being shown, and each click places a component, so the same
     * one can be placed again and again.
     */
    setPaletteComponent(paletteComponent: PaletteComponent | null): void {
        const previous = this.paletteComponent?.className ?? null;
        const current = paletteComponent?.className ?? null;
        this.paletteComponent = paletteComponent;
        // The store hands over a new object for every update. The ghost only changes with the kind of component.
        if (previous === current) return;

        this.discardGhost();
        if (current && this.ensureGhost() && this.lastPointer) this.moveGhostTo(this.lastPointer);
    }

    /** Tells the controller which component that was already placed is selected, or null when none is. */
    setSelectedSelectable(selectedSelectable: SelectedSelectable | null): void {
        this.selectedSelectable = selectedSelectable;
    }

    /** Tells the controller about the settings of the workspace. They set the grid components snap to. */
    setWorkspaceSettings(settings: WorkspaceSettingsState | null): void {
        this.gridSpacing = settings?.gridSettings?.gridSpacing || DEFAULT_GRID_SPACING;
    }

    /**
     * Esc clears the selection: a pending ghost disappears, the palette is un-highlighted and a placed component is
     * deselected. The keyboard service already leaves out typing in a field and keys something else handled.
     *
     * @returns True if there was a selection to clear. Otherwise Esc is left for whatever else wants it.
     */
    private onEscape(): boolean {
        if (!this.paletteComponent && !this.selectedSelectable) return false;
        this.selectionCleared$.next();
        return true;
    }

    /** Whether this workspace is the one currently shown. Every open workspace is listening to the mouse. */
    private isActive(): boolean {
        return this.view !== null && this.renderService.activeId === this.workspaceId;
    }

    /**
     * Makes the ghost for the selected palette component, if there should be one: a component is waiting to be placed
     * and this is the workspace being shown. A workspace that isn't being shown has no ghost, so one is made on the
     * first mouse move after the user switches to it.
     *
     * @returns The ghost, or null if there shouldn't be one
     */
    private ensureGhost(): Placeable | null {
        const className = this.paletteComponent?.className;
        if (!this.ghost && className && this.isActive()) {
            // The position is set from the pointer, as soon as there is one. It is shown then.
            this.ghost = createPlaceable(className, { x: 0, y: 0 });
            this.ghost.isGhost = true;
        }
        return this.ghost;
    }

    /** Removes the ghost, if there is one, because nothing is waiting to be placed anymore. */
    private discardGhost() {
        const ghost = this.ghost;
        this.ghost = null;
        if (ghost) this.view?.hidePreview(ghost);
    }

    /** The ghost follows the pointer, snapped to the grid. */
    private onMouseMove(event: MouseEvent) {
        if (!this.isActive()) return;
        this.lastPointer = { x: event.clientX, y: event.clientY };
        if (this.ensureGhost()) this.moveGhostTo(this.lastPointer);
    }

    /**
     * A left click places the previewed component where it is previewed: it becomes a regular component of the
     * diagram. The palette component stays selected, so a new ghost takes its place.
     */
    private onMouseClick(event: MouseEvent) {
        if (event.button !== 0 || !this.isActive() || !this.ensureGhost()) return;
        const pointer = { x: event.clientX, y: event.clientY };
        // a click without a preceding move (touch, for example) still needs to land where it was clicked
        this.moveGhostTo(pointer);

        const placed = this.ghost!;
        this.ghost = null;
        placed.isGhost = false;
        this.view!.hidePreview(placed);
        this.view!.place(placed);

        if (this.ensureGhost()) this.moveGhostTo(pointer);
    }

    /** Dragging pans the diagram. */
    private onMouseDrag(event: MouseEvent) {
        if (!this.isActive()) return;
        const element = this.view!.element;
        this.renderService.panActiveDiagram(event.movementX, event.movementY, element.clientWidth, element.clientHeight);
        // eventually link mouse mode to a cursor style using the store
        this.panning = true;
        this.view!.setCursor('grabbing');
    }

    /** Ends a pan. */
    private onMouseUp() {
        if (!this.panning) return;
        this.panning = false;
        this.view?.setCursor('default');
    }

    /**
     * Moves the ghost so that the pointer is at the middle of its bounding box, snapped to the grid.
     * The ghost is shown the first time it is positioned.
     * @param pointer Pointer position in client coordinates
     */
    private moveGhostTo(pointer: Point) {
        const ghost = this.ghost;
        const view = this.view;
        const cursor = view?.clientToDiagram(pointer);
        if (!ghost || !view || !cursor) return;

        const box = ghost.getBoundingBox();
        const position = this.snapToGrid({
            x: cursor.x - (box.x + box.width / 2),
            y: cursor.y - (box.y + box.height / 2)
        });

        if (view.isPreviewing(ghost) && position.x === ghost.position.x && position.y === ghost.position.y) return;
        ghost.position = position;
        view.showPreview(ghost);
    }

    /**
     * Snaps a diagram position to the nearest grid point on the canvas. The grid is drawn on the canvas, not relative
     * to the diagram origin, so snapping happens in canvas coordinates to line up with the grid points the user sees.
     */
    private snapToGrid(position: Point): Point {
        const origin = this.renderService.activeDrawState?.origin ?? { x: 0, y: 0 };
        const spacing = this.gridSpacing;
        const snap = (value: number, offset: number) => Math.round((value + offset) / spacing) * spacing - offset;
        return { x: snap(position.x, origin.x), y: snap(position.y, origin.y) };
    }
}
