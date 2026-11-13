import { describe, it, expect } from 'vitest';
import { createPlaceable, isIOComponent, isPlaceable } from './ComponentFactory';
import * as gates from './gates';
import * as io from './io';
import * as decorations from './decorations';
import { initialComponentsState } from '../../store/components/feature';
import { ComponentType } from './Component';

describe('ComponentFactory', () => {
    describe('createPlaceable', () => {
        it('should create every class the palette offers without throwing', () => {
            const classNames = Object.values(initialComponentsState.paletteComponents)
                .flat()
                .map(c => c.type);
            expect(classNames.length).toBeGreaterThan(0);
            for (const className of classNames) {
                expect(() => createPlaceable(className, { x: 0, y: 0 }), className).not.toThrow();
            }
        });

        it('should create an instance of the named class', () => {
            expect(createPlaceable(ComponentType.AndGate, { x: 0, y: 0 })).toBeInstanceOf(gates.AndGate);
            expect(createPlaceable(ComponentType.XnorGate, { x: 0, y: 0 })).toBeInstanceOf(gates.XnorGate);
            expect(createPlaceable(ComponentType.Output, { x: 0, y: 0 })).toBeInstanceOf(io.Output);
            expect(createPlaceable(ComponentType.Text, { x: 0, y: 0 })).toBeInstanceOf(decorations.Text);
        });

        it('should give every instance an id, so a component can be referred to without holding it', () => {
            const componentTypes = Object.values(initialComponentsState.paletteComponents).flat().map(c => c.type);
            for (const component of componentTypes) {
                expect(createPlaceable(component, { x: 0, y: 0 }).id, component).toEqual(expect.any(String));
                expect(createPlaceable(component, { x: 0, y: 0 }).id, component).not.toBe('');
            }
        });

        it('should give each instance its own id, even of the same class', () => {
            const ids = Array.from({ length: 50 }, () => createPlaceable(ComponentType.AndGate, { x: 0, y: 0 }).id);
            expect(new Set(ids).size).toBe(50);
        });

        it('should not change the id when the instance moves', () => {
            const gate = createPlaceable(ComponentType.AndGate, { x: 0, y: 0 });
            const { id } = gate;
            gate.position = { x: 100, y: 100 };
            gate.isGhost = true;
            expect(gate.id).toBe(id);
        });

        it('should create instances that are not ghosts', () => {
            expect(createPlaceable(ComponentType.OrGate, { x: 0, y: 0 }).isGhost).toBe(false);
        });

        it('should position the instance at a copy of the given point', () => {
            const point = { x: 40, y: 60 };
            const placeable = createPlaceable(ComponentType.AndGate, point);
            expect(placeable.position).toEqual({ x: 40, y: 60 });
            expect(placeable.position).not.toBe(point);
        });

        it('should create independent instances', () => {
            const a = createPlaceable(ComponentType.AndGate, { x: 0, y: 0 });
            const b = createPlaceable(ComponentType.AndGate, { x: 0, y: 0 });
            a.position = { x: 100, y: 100 };
            expect(b.position).toEqual({ x: 0, y: 0 });
        });
    });

    describe('getBoundingBox', () => {
        it('should give every placeable a non-empty bounding box', () => {
            const componentTypes = Object.values(initialComponentsState.paletteComponents).flat().map(c => c.type);
            for (const component of componentTypes) {
                const box = createPlaceable(component, { x: 0, y: 0 }).getBoundingBox();
                expect(box.width, component).toBeGreaterThan(0);
                expect(box.height, component).toBeGreaterThan(0);
            }
        });

        it('should return a copy so callers cannot change the shared footprint', () => {
            const gate = createPlaceable(ComponentType.AndGate, { x: 0, y: 0 });
            gate.getBoundingBox().width = 1;
            expect(gate.getBoundingBox().width).toBe(120);
        });

        it('should cover the and gate body and pins that draw() draws', () => {
            // draw(): body 0..80, input pins 20px left of it, output pin 20px right of it, 80px tall
            expect(new gates.AndGate({ x: 0, y: 0 }, 2).getBoundingBox()).toEqual({ x: -20, y: 0, width: 120, height: 80 });
        });
    });

    describe('isPlaceable', () => {
        it('should accept components and decorations', () => {
            expect(isPlaceable(createPlaceable(ComponentType.AndGate, { x: 0, y: 0 }))).toBe(true);
            expect(isPlaceable(createPlaceable(ComponentType.Text, { x: 0, y: 0 }))).toBe(true);
        });

        it('should reject null, undefined and selectables that cannot be previewed', () => {
            const defaultBoundingBox = { x: 0, y: 0, width: 0, height: 0 };
            expect(isPlaceable(null)).toBe(false);
            expect(isPlaceable(undefined)).toBe(false);
            expect(isPlaceable({ isSelected: () => false, getBoundingBox: () => defaultBoundingBox })).toBe(false);
        });
    });

    describe('isIOComponent', () => {
        it('should be true only for I/O components', () => {
            expect(isIOComponent(createPlaceable(ComponentType.Input, { x: 0, y: 0 }))).toBe(true);
            expect(isIOComponent(createPlaceable(ComponentType.Output, { x: 0, y: 0 }))).toBe(true);
            expect(isIOComponent(createPlaceable(ComponentType.SevenSeg, { x: 0, y: 0 }))).toBe(true);
            expect(isIOComponent(createPlaceable(ComponentType.AndGate, { x: 0, y: 0 }))).toBe(false);
            expect(isIOComponent(createPlaceable(ComponentType.Text, { x: 0, y: 0 }))).toBe(false);
        });
    });
});
