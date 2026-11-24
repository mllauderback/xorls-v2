import { describe, it, expect } from 'vitest';
import { Orientation, Property, PROPERTY_DEFINITIONS, ORDERED_PROPERTY_FIELDS, PropertyRecord, describeAcceptedValues, validatePropertyValue } from './Property';
import { Node } from './components/Component';
import { Text } from './components/decorations';

describe('Property', () => {
    it('should change its value', () => {
        const property = new Property(2);

        property.value = 3;

        expect(property.value).toBe(3);
    });

    it('should keep a copy of the record it is made from', () => {
        const fields = { 'Label': new Property('a') };
        const record = new PropertyRecord(fields);

        Object.assign(fields, { 'Font Size': new Property(10) });

        expect(record.get('Font Size')).toBeUndefined();
        expect(record.get('Label')?.value).toBe('a');
    });

    it('should refuse any change when it is readonly', () => {
        const property = new Property(0n, true);

        expect(property.isReadonly).toBe(true);
        expect(() => property.value = 1n).toThrow('Property is readonly');
        expect(property.value).toBe(0n);
    });

    it('should not be readonly unless it is made so', () => {
        expect(new Property('').isReadonly).toBe(false);
    });
});

describe('PROPERTY_DEFINITIONS', () => {
    it('should list the fields in the order the properties panel shows them', () => {
        // the panel follows this order: change it on purpose, not by moving a definition
        expect(ORDERED_PROPERTY_FIELDS).toEqual([
            'Number of Inputs',
            'Orientation',
            'Input Value',
            'Input Format',
            'Output Value',
            'Output Format',
            'Bus Width',
            'Label',
            'Font Size',
        ]);
        expect(ORDERED_PROPERTY_FIELDS).toEqual(Object.keys(PROPERTY_DEFINITIONS));
    });

    it('should offer every orientation', () => {
        expect(PROPERTY_DEFINITIONS['Orientation']).toEqual({ kind: 'enum', options: ['North', 'East', 'South', 'West'] });
    });
});

describe('validatePropertyValue', () => {
    it.each([2, 16, 32])('should accept %s inputs', count => {
        expect(validatePropertyValue('Number of Inputs', count)).toBe(true);
    });

    it.each([1, 33, 2.5, Number.NaN, '4'])('should refuse %s inputs', count => {
        expect(validatePropertyValue('Number of Inputs', count)).toBe(false);
    });

    it('should accept only a bigint for a signal value', () => {
        expect(validatePropertyValue('Output Value', 5n)).toBe(true);
        expect(validatePropertyValue('Output Value', 5)).toBe(false);
        expect(validatePropertyValue('Input Value', '5')).toBe(false);
    });

    it('should accept only an orientation for Orientation', () => {
        for (const orientation of Object.values(Orientation)) {
            expect(validatePropertyValue('Orientation', orientation)).toBe(true);
        }
        expect(validatePropertyValue('Orientation', 'north')).toBe(false);
    });

    it('should accept any string for a label', () => {
        expect(validatePropertyValue('Label', '')).toBe(true);
        expect(validatePropertyValue('Label', 'clk')).toBe(true);
        expect(validatePropertyValue('Label', 1)).toBe(false);
    });

    it('should keep the bus width and font size in range', () => {
        expect(validatePropertyValue('Bus Width', 0)).toBe(false);
        expect(validatePropertyValue('Bus Width', 8)).toBe(true);
        expect(validatePropertyValue('Font Size', 14)).toBe(true);
        expect(validatePropertyValue('Font Size', 0)).toBe(false);
    });
});

describe('describeAcceptedValues', () => {
    it.each([
        ['Number of Inputs', 'a whole number from 2 to 32'],
        ['Output Value', 'a bigint'],
        ['Orientation', 'one of North, East, South, West'],
        ['Label', 'a string'],
    ] as const)('should describe what %s accepts', (field, description) => {
        expect(describeAcceptedValues(field)).toBe(description);
    });
});

describe('updateProperty on selectables that are not components', () => {
    it('should keep the bus width of a node fixed', () => {
        expect(() => new Node({ x: 0, y: 0 }).updateProperty('Bus Width', 2)).toThrow('Bus Width of Node is readonly');
    });

    it('should set the font size of a text decoration', () => {
        const text = new Text({ x: 0, y: 0 });

        text.updateProperty('Font Size', 20);

        expect(text.properties.get('Font Size')?.value).toBe(20);
        expect(text.fontSize).toBe(20);
        expect(() => text.updateProperty('Number of Inputs', 2)).toThrow('Text does not have property Number of Inputs');
    });
});
