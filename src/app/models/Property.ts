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

export type PropertyType = number | string | boolean | Orientation | BigInt;

export class Property {

    private readonly isReadonly: boolean;
    private _value: PropertyType;

    constructor(value: PropertyType, readonly = false) {
        this.isReadonly = readonly;
        this._value = value;
    }

    public get value() {
        return this._value;
    }

    public set value(value: PropertyType) {
        if (value !== this._value) throw new Error(`Mismatched property types: trying to set ${typeof value} to ${typeof this._value}`);
        if (this.isReadonly) throw new Error(`Property is readonly`);
        this._value = value;
    }
}