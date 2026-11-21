import { describe, it, expect } from 'vitest';
import { PROPERTY_FIELDS, validatePropertyValue } from '../Property';
import type { Component } from './Component';
import * as gates from './gates';
import * as io from './io';

const everyComponent: (() => Component)[] = [
    () => new gates.AndGate({ x: 0, y: 0 }, 2),
    () => new gates.OrGate({ x: 0, y: 0 }, 2),
    () => new gates.XorGate({ x: 0, y: 0 }, 2),
    () => new gates.NotGate({ x: 0, y: 0 }),
    () => new gates.Buffer({ x: 0, y: 0 }),
    () => new gates.NandGate({ x: 0, y: 0 }, 2),
    () => new gates.NorGate({ x: 0, y: 0 }, 2),
    () => new gates.XnorGate({ x: 0, y: 0 }, 2),
    () => new io.Input({ x: 0, y: 0 }),
    () => new io.Output({ x: 0, y: 0 }),
    () => new io.SevenSegmentDisplay({ x: 0, y: 0 }),
];

describe('Component', () => {
    describe.each(everyComponent.map(create => [create().type, create] as const))('%s', (_type, create) => {
        it('should only hold values its fields accept', () => {
            const component = create();
            for (const field of PROPERTY_FIELDS) {
                const property = component.properties.get(field);
                // readonly fields may hold a value no one could set, like the single input of a NOT gate
                if (property && !property.isReadonly) expect(validatePropertyValue(field, property.value), field).toBe(true);
            }
        });

        it('should be selected inside its bounding box and not outside it', () => {
            const component = create();
            const box = component.getBoundingBox();

            expect(component.isSelected({ x: box.width / 2, y: box.height / 2 })).toBe(true);
            expect(component.isSelected({ x: box.width + 0.1, y: 0 })).toBe(false);
        });
    });

    describe('Number of Inputs', () => {
        it('should make that many input nodes', () => {
            const gate = new gates.AndGate({ x: 0, y: 0 }, 2);

            gate.updateProperty('Number of Inputs', 5);

            expect(gate.properties.get('Number of Inputs')?.value).toBe(5);
            expect(gate.inodes).toHaveLength(5);
        });

        it.each([1, 33, 2.5])('should refuse %s inputs and keep the nodes it has', count => {
            const gate = new gates.OrGate({ x: 0, y: 0 }, 2);
            const inodes = gate.inodes;

            expect(() => gate.updateProperty('Number of Inputs', count)).toThrow('Number of Inputs must be a whole number from 2 to 32');
            expect(gate.inodes).toBe(inodes);
            expect(gate.properties.get('Number of Inputs')?.value).toBe(2);
        });

        it.each([
            ['NotGate', () => new gates.NotGate({ x: 0, y: 0 })],
            ['Buffer', () => new gates.Buffer({ x: 0, y: 0 })],
        ])('should be fixed at 1 for a %s', (_name, create) => {
            const gate = create();

            expect(gate.properties.get('Number of Inputs')?.value).toBe(1);
            expect(() => gate.updateProperty('Number of Inputs', 2)).toThrow('is readonly');
        });
    });
});
