/**
 * Every property a selectable can have. This is also the order the properties panel lists them in, whatever order a
 * selectable declares its own properties in, so a property is always in the same place relative to the others.
 */
export const PROPERTY_FIELDS = [
    'Number of Inputs',
    'Orientation',
    'Output Value',
    'Input Value',
    'Bus Width',
    'Label',
    'Font Size',
] as const;
export type PropertyField = (typeof PROPERTY_FIELDS)[number];

export enum Orientation {
    north = 'North',
    east = 'East',
    south = 'South',
    west = 'West'
}

export type PropertyType = number | string | boolean | Orientation | bigint;

/** How a property's value is edited, and which values it accepts. */
export type PropertyDefinition =
    /** A whole number between min and max, inclusive. */
    | { kind: 'integer', min: number, max: number }
    /** A signal value: a bus can be wider than a number holds exactly, so it is a bigint. */
    | { kind: 'bigint' }
    /** One of a fixed list of strings. */
    | { kind: 'enum', options: readonly string[] }
    | { kind: 'text' };

/** What each property field accepts. Every selectable that has a field shares its definition. */
export const PROPERTY_DEFINITIONS: Readonly<Record<PropertyField, PropertyDefinition>> = {
    'Number of Inputs': { kind: 'integer', min: 2, max: 32 },
    'Orientation': { kind: 'enum', options: Object.values(Orientation) },
    'Output Value': { kind: 'bigint' },
    'Input Value': { kind: 'bigint' },
    'Bus Width': { kind: 'integer', min: 1, max: 64 },
    'Label': { kind: 'text' },
    'Font Size': { kind: 'integer', min: 6, max: 72 },
};

/** Whether a field accepts a value, going by the field's definition. */
export function validatePropertyValue(field: PropertyField, value: PropertyType): boolean {
    const definition = PROPERTY_DEFINITIONS[field];
    switch (definition.kind) {
        case 'integer':
            return typeof value === 'number' && Number.isInteger(value) && value >= definition.min && value <= definition.max;
        case 'bigint':
            return typeof value === 'bigint';
        case 'enum':
            return typeof value === 'string' && definition.options.includes(value);
        case 'text':
            return typeof value === 'string';
    }
}

/** Says which values a field accepts, for error messages, e.g. "a whole number from 2 to 32". */
export function describeAcceptedValues(field: PropertyField): string {
    const definition = PROPERTY_DEFINITIONS[field];
    switch (definition.kind) {
        case 'integer':
            return `a whole number from ${definition.min} to ${definition.max}`;
        case 'bigint':
            return 'a bigint';
        case 'enum':
            return `one of ${definition.options.join(', ')}`;
        case 'text':
            return 'a string';
    }
}

export class Property {

    /** A readonly property is shown but can't be changed, e.g. a value the simulation sets. */
    readonly isReadonly: boolean;
    private _value: PropertyType;

    constructor(value: PropertyType, readonly = false) {
        this.isReadonly = readonly;
        this._value = value;
    }

    public get value(): PropertyType {
        return this._value;
    }

    /** @throws If the property is readonly, or the value isn't the same type as the current one */
    public set value(value: PropertyType) {
        if (this.isReadonly) throw new Error(`Property is readonly`);
        if (typeof value !== typeof this._value) throw new Error(`Mismatched property types: trying to set ${typeof value} to ${typeof this._value}`);
        this._value = value;
    }

    /**
     * Converts property value to serializable type
     * @returns
     */
    public getSerializedValue(): SerializedPropertyValue {
        return typeof this._value === 'bigint' ? this._value.toString() : this._value;
    }
}

/** The properties of a selectable: only the fields it has. */
// export type PropertyRecord = Partial<Record<PropertyField, Property>>;
export class PropertyRecord {

    private _record: Partial<Record<PropertyField, Property>>;

    constructor(initialRecord: Partial<Record<PropertyField, Property>>) {
        this._record = initialRecord;
    }

    public get(field: PropertyField): Property | undefined {
        if (!Object.hasOwn(this._record, field)) return undefined;
        return this._record[field];
    }

    public set(field: PropertyField, value: Property) {
        if (!Object.hasOwn(this._record, field)) throw new Error(`No field ${field}`);
        this._record[field] = value;
    }

    public serialize(): SerializedPropertyRecord {
        const serialized: SerializedPropertyRecord = {};
        for (const field of PROPERTY_FIELDS) {
            const property = this._record[field];
            if (property) serialized[field] = { value: property.getSerializedValue(), readonly: property.isReadonly };
        }
        return serialized;
    }
}

/**
 * A property value as the store holds it. A bigint is held as its decimal string, because the store has to stay
 * JSON-serializable (the devtools serialize it) and JSON can't hold a bigint. The field's definition says which
 * strings are bigints: see property-state.ts.
 */
export type SerializedPropertyValue = number | string | boolean;

/** A plain-data copy of one of a selectable's properties. */
export interface SerializedProperty {
    value: SerializedPropertyValue;
    readonly: boolean;
}

/** A plain-data copy of a selectable's properties: only the fields it has. */
export type SerializedPropertyRecord = Partial<Record<PropertyField, SerializedProperty>>;
/**
 * Converts a value the store holds back to the property's own type.
 * @returns The value, or null when a bigint field holds a string that isn't a whole number in decimal
 */
export function fromSerializedValue(field: PropertyField, value: SerializedPropertyValue): PropertyType | null {
    if (PROPERTY_DEFINITIONS[field].kind !== 'bigint' || typeof value !== 'string') return value;
    return /^-?\d+$/.test(value) ? BigInt(value) : null;
}

/** One row of the properties panel. */
export interface PropertyListItem extends SerializedProperty {
    field: PropertyField;
    definition: PropertyDefinition;
}

/**
 * Lists serialized properties in the order of PROPERTY_FIELDS, whatever order they were added in, so a property is
 * always in the same place relative to the others.
 */
export function toOrderedList(values: SerializedPropertyRecord): PropertyListItem[] {
    return PROPERTY_FIELDS
        .filter(field => values[field])
        .map(field => ({ field, definition: PROPERTY_DEFINITIONS[field], ...values[field]! }));
}