import { describe, it, expect } from 'vitest';
import { fromSerializedValue, Orientation, Property, PropertyRecord, toOrderedList } from '../../models/Property';
import { AndGate } from '../../models/components/gates';
import { createPlaceable } from '../../models/components/ComponentFactory';
import { ComponentType } from '../../models/components/Component';

describe('property state', () => {
    describe('toSerializedValue and fromSerializedValue', () => {
        it('should hold a bigint as its decimal string and turn it back', () => {
            const property = new Property(12345678901234567890n);
            expect(property.getSerializedValue()).toBe('12345678901234567890');
            expect(fromSerializedValue('Output Value', '12345678901234567890')).toBe(12345678901234567890n);
        });

        it('should leave every other value as it is', () => {
            const numberProperty = new Property(3);
            const stringProperty = new Property('string');
            const orientationProperty = new Property(Orientation.east);
            expect(numberProperty.getSerializedValue()).toBe(3);
            expect(stringProperty.getSerializedValue()).toBe('string');
            expect(orientationProperty.getSerializedValue()).toBe('East');
            expect(fromSerializedValue('Label', '42')).toBe('42');
            expect(fromSerializedValue('Number of Inputs', 3)).toBe(3);
        });

        it.each(['ff', '1.5', '', '1e3'])('should give null for %j in a bigint field instead of throwing', value => {
            expect(fromSerializedValue('Output Value', value)).toBeNull();
        });

        it('should read a negative bigint', () => {
            expect(fromSerializedValue('Input Value', '-3')).toBe(-3n);
        });
    });

    describe('toSerializedPropertyRecord', () => {
        it('should copy every property of a component, with whether it is readonly', () => {
            const andGate = new AndGate({ x: 0, y: 0 }, 2);
            expect(andGate.properties.serialize()).toEqual({
                'Number of Inputs': { value: 2, readonly: false },
                'Orientation': { value: 'East', readonly: false },
                'Output Value': { value: '0', readonly: true },
                'Bus Width': { value: 1, readonly: false },
            });
        });

        it.each(Object.values(ComponentType))('should make plain data out of a %s, so it survives a JSON round trip', type => {
            const states = createPlaceable(type, { x: 0, y: 0 }).properties.serialize();

            expect(JSON.parse(JSON.stringify(states))).toEqual(states);
        });
    });

    describe('toOrderedList', () => {
        it('should give each row its definition', () => {
            const [orientation] = toOrderedList(new PropertyRecord({ 'Orientation': new Property(Orientation.east) }).serialize());

            expect(orientation).toEqual({
                field: 'Orientation',
                value: 'East',
                readonly: false,
                definition: { kind: 'enum', options: ['North', 'East', 'South', 'West'] },
            });
        });

        it('should be empty when there are no properties', () => {
            expect(toOrderedList(new PropertyRecord({}).serialize())).toEqual([]);
        });

        it('should order serialized properties whatever order their keys are in', () => {
            const list = toOrderedList({
                'Label': { value: 'clk', readonly: false },
                'Output Value': { value: '0', readonly: false },
                'Orientation': { value: 'East', readonly: false },
            });

            expect(list.map(item => item.field)).toEqual(['Orientation', 'Output Value', 'Label']);
            expect(list[1]).toEqual({ field: 'Output Value', value: '0', readonly: false, definition: { kind: 'bigint' } });
        });
    });
});
