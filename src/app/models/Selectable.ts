import type { Point } from "./Point";
import type { Property, PropertyField } from "./Property";

/**
 * The size of a selectable's footprint. The box's top-left corner is always the owner's `position`: x = 0 is the
 * left-most drawn pixel and y = 0 is the top-most drawn pixel.
 */
export class BoundingBox {
    private _width: number;
    private _height: number;

    /**
     * Creates a new bounding box.
     * @param width 
     * @param height 
     */
    constructor(width: number, height: number) {
        this._width = width;
        this._height = height;
    }

    get width(): number {
        return this._width;
    }

    set width(width: number) {
        this._width = width;
    }

    get height(): number {
        return this._height;
    }

    set height(height: number) {
        this._height = height;
    }

    /**
     * Returns true if the point is inside the bounding box.
     * @param point 
     * @param boundingBoxOffset The x,y position of the top left corner of the bounding box
     */
    containsPoint(point: Point, boundingBoxOffset: Point) {
        const bottomRightX = boundingBoxOffset.x + this._width;
        const bottomRightY = boundingBoxOffset.y + this._height;
        return (point.x >= boundingBoxOffset.x && point.y >= boundingBoxOffset.y) && (point.x <= bottomRightX && point.y <= bottomRightY);
    }
}

export interface Selectable {
    properties: Partial<Record<PropertyField, Property>>;

    /**
     * Returns true when mousePosition is inside the selectable's bounding box.
     * @param mousePosition 
     */
    isSelected(mousePosition: Point): boolean;
    /** Bounding box whose top-left corner is the object's `position`, including pins/nodes. */
    getBoundingBox(): BoundingBox;
}