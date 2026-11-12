import type { Drawable } from '../../../../models/Drawable';
import type { Placeable } from '../../../../models/components/ComponentFactory';
import type { Point } from '../../../../models/Point';

/**
 * What the diagram controller needs from the view it controls. The presenter implements it. The controller knows
 * nothing about canvases, layers or templates: it says what should be shown, and the view decides how.
 */
export interface DiagramView {
    /** The element the diagram is shown in. The pointer is only followed over it, and it is what gets the cursor. */
    readonly element: HTMLElement;

    /**
     * Converts a pointer position (client coordinates) to diagram coordinates, i.e. relative to the diagram origin,
     * taking into account where the diagram is on screen and how far it is panned.
     *
     * @returns The position, or null while the view can't tell yet
     */
    clientToDiagram(client: Point): Point | null;

    /** Whether the drawable is currently shown as a preview. */
    isPreviewing(drawable: Drawable): boolean;

    /** Shows a drawable as a preview, above the diagram. Showing one that is already there redraws it where it is now. */
    showPreview(drawable: Drawable): void;

    /** Stops showing a drawable as a preview. Does nothing if it isn't. */
    hidePreview(drawable: Drawable): void;

    /** Makes a component a regular part of the diagram, shown with the other components of its kind. */
    place(placed: Placeable): void;

    /** Sets the mouse cursor over the diagram. */
    setCursor(cursor: string): void;
}
