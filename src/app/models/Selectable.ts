import type { Point } from "./Point";
import { describeAcceptedValues, validatePropertyValue, type PropertyField, type PropertyRecord, type PropertyType, type ReadonlyPropertyRecord } from "./Property";

/**
 * The size of a selectable's footprint, and where it is relative to the owner's `position`. The box covers everything
 * the owner draws. It is whole grid cells, so a footprint placed on a grid point has its pins on grid points: a gate's
 * footprint can reach half a cell past its back, to the next whole cell.
 *
 * The box's top-left corner is `left` and `top` from the owner's position: usually 0, and negative when the owner draws
 * above or left of its position, like a gate whose back grows above its body or a gate that faces another way. The
 * position stays put when the box grows or turns, so what the owner draws there doesn't move.
 */
export class BoundingBox {
    private _width: number;
    private _height: number;
    private readonly _top: number;
    private readonly _left: number;

    /**
     * Creates a new bounding box.
     * @param width
     * @param height
     * @param top Where the box's top is, relative to the owner's position y
     * @param left Where the box's left edge is, relative to the owner's position x
     */
    constructor(width: number, height: number, top = 0, left = 0) {
        this._width = width;
        this._height = height;
        this._top = top;
        this._left = left;
    }

    /** Where the box's top is, relative to the owner's position y: 0, or negative when the box reaches above it. */
    get top(): number {
        return this._top;
    }

    /** Where the box's left edge is, relative to the owner's position x. */
    get left(): number {
        return this._left;
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
     * @param position The owner's position: the box's top-left corner is `left` and `top` from it
     */
    containsPoint(point: Point, position: Point) {
        const left = position.x + this._left;
        const top = position.y + this._top;
        return point.x >= left && point.y >= top && point.x <= left + this._width && point.y <= top + this._height;
    }
}

/**
 * The base of every selectable. It is selected wherever its bounding box is, placed at its position.
 * Outside code reads properties through the read-only view `properties`, and changes
 * them only through updateProperty, which a subclass overrides when a change has more to update. setPropertyValue
 * is the checked write that updateProperty is built on, and only subclasses can reach it.
 */
export abstract class Selectable {
    /** The writable record. Only this class and its subclasses can change a value through it. */
    protected readonly _properties: PropertyRecord;

    /** Names the selectable in error messages, e.g. its component type. */
    protected abstract readonly displayName: string;

    abstract position: Point;

    /**
     * @param properties The selectable's properties: only the fields it has
     */
    constructor(properties: PropertyRecord) {
        this._properties = properties;
    }

    /** The selectable's properties, to read. Change one with updateProperty. */
    get properties(): ReadonlyPropertyRecord {
        return this._properties;
    }

    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

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
        const property = this._properties.get(field);
        if (!property) throw new Error(`${this.displayName} does not have property ${field}`);
        if (property.isReadonly) throw new Error(`${field} of ${this.displayName} is readonly`);
        if (!validatePropertyValue(field, value)) throw new Error(`${field} must be ${describeAcceptedValues(field)}, not ${String(value)}`);
        property.value = value;
    }
}
