/** A rectangle expressed relative to its owner's `position`. */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Implemented by anything that occupies a rectangular area of the diagram.
 * Used to centre a ghost on the mouse cursor while it is being placed.
 */
export interface Bounded {
    /** Bounding box relative to the object's `position`, including pins/nodes. */
    getBoundingBox(): BoundingBox;
}
