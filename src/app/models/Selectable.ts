import type { Point } from "./Point";

/** A rectangle expressed relative to its owner's `position`. */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Selectable {
    /**
     * Returns true when mousePosition is inside the selectable's bounding box.
     * @param mousePosition 
     */
    isSelected(mousePosition: Point): boolean;
    /** Bounding box relative to the object's `position`, including pins/nodes. */
    getBoundingBox(): BoundingBox;
}