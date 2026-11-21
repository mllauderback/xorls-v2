import { describe, it, expect } from 'vitest';
import { Property } from '../Property';
import { BoundingBox } from '../Selectable';
import { Component, ComponentType } from './Component';
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
        it('should be a Component that starts as a non-ghost at its position', () => {
            const component = create();

            expect(component).toBeInstanceOf(Component);
            expect(component.isGhost).toBe(false);
            expect(component.position).toEqual({ x: 0, y: 0 });
            expect(component.id).toBeTruthy();
        });

        it('should have a different id from another of its kind', () => {
            expect(create().id).not.toBe(create().id);
        });

        it('should replace a property it has', () => {
            const component = create();
            const property = new Property('South');

            component.updateProperty('Orientation', property);

            expect(component.properties['Orientation']).toBe(property);
        });

        it('should refuse a property it does not have', () => {
            const component = create();

            expect(() => component.updateProperty('Font Size', new Property(10))).toThrow(`${component.type} does not have property Font Size`);
            expect(Object.hasOwn(component.properties, 'Font Size')).toBe(false);
        });

        it('should be selected inside its bounding box and not outside it', () => {
            const component = create();
            const box = component.getBoundingBox();

            expect(component.isSelected({ x: box.width / 2, y: box.height / 2 })).toBe(true);
            expect(component.isSelected({ x: box.width + 0.1, y: 0 })).toBe(false);
        });
    });

    it('should let a subclass override the default behaviour', () => {
        class Fixed extends Component {
            readonly type = ComponentType.Buffer;
            properties = {};
            draw() { /* nothing to draw */ }
            getBoundingBox() {
                return new BoundingBox(4, 2);
            }
            override isSelected(): boolean {
                return false;
            }
        }

        expect(new Fixed({ x: 0, y: 0 }).isSelected()).toBe(false);
    });
});
