import type { Point } from "./Point";
import { describeAcceptedValues, validatePropertyValue, type PropertyField, type PropertyRecord, type PropertyType } from "./Property";

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
    /** The selectable's properties: only the fields it has. */
    properties: PropertyRecord;

    /**
     * Returns true when mousePosition is inside the selectable's bounding box.
     * @param mousePosition 
     */
    isSelected(mousePosition: Point): boolean;

    /** Bounding box whose top-left corner is the object's `position`, including pins/nodes. */
    getBoundingBox(): BoundingBox;

    /**
     * Sets the value of one of the selectable's properties, and updates whatever depends on it.
     * @param field The field of the property to update
     * @param value The new value
     * @throws If the selectable doesn't have the property, it is readonly, or the field doesn't accept the value
     */
    updateProperty(field: PropertyField, value: PropertyType): void;
}

/**
 * The base of every selectable. Outside code changes a property through updateProperty, which a subclass overrides
 * when a change has more to update. setPropertyValue is the checked write that updateProperty is built on, and only
 * subclasses can reach it.
 */
export abstract class AbstractSelectable implements Selectable {
    abstract properties: PropertyRecord;

    /** Names the selectable in error messages, e.g. its component type. */
    protected abstract readonly displayName: string;

    abstract isSelected(mousePosition: Point): boolean;

    abstract getBoundingBox(): BoundingBox;

    /**
     * Sets the value of one of the selectable's properties.
     * @throws If the selectable doesn't have the property, it is readonly, or the field doesn't accept the value.
     * Nothing changes then.
     */
    updateProperty(field: PropertyField, value: PropertyType): void {
        this.setPropertyValue(field, value);
    }

    /**
     * Sets a property's value after checking that the selectable has the property, that it can be changed and that
     * the field accepts the value. Nothing changes when a check fails.
     * @throws If a check fails
     */
    protected setPropertyValue(field: PropertyField, value: PropertyType): void {
        const property = this.properties.get(field);
        if (!property) throw new Error(`${this.displayName} does not have property ${field}`);
        if (property.isReadonly) throw new Error(`${field} of ${this.displayName} is readonly`);
        if (!validatePropertyValue(field, value)) throw new Error(`${field} must be ${describeAcceptedValues(field)}, not ${String(value)}`);
        property.value = value;
    }
}
