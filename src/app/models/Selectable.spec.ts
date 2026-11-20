import { describe, it, expect } from 'vitest';
import { Property } from './Property';
import type { PropertyField, PropertyType } from './Property';
import { PropertyRecord } from './Property';
import { Selectable, BoundingBox } from './Selectable';

class MinimalSelectable extends Selectable {
    protected readonly displayName = 'MinimalSelectable';

    position = { x: 10, y: 20 };

    constructor() {
        super(new PropertyRecord({ 'Label': new Property('a'), 'Output Value': new Property(0n, true) }));
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 2, -1, -2);
    }
}

class Watching extends MinimalSelectable {
    /** What the override saw, to check that it runs after the value is set. */
    seen: PropertyType[] = [];

    override updateProperty(field: PropertyField, value: PropertyType): void {
        super.updateProperty(field, value);
        this.seen.push(this.properties.get(field)!.value);
    }
}

describe('Selectable', () => {
    it('should be selected inside its bounding box, placed at its position, edges included', () => {
        const thing = new MinimalSelectable();

        expect(thing.isSelected({ x: 10, y: 20 })).toBe(true);
        expect(thing.isSelected({ x: 8, y: 19 })).toBe(true);
        expect(thing.isSelected({ x: 12, y: 21 })).toBe(true);
        expect(thing.isSelected({ x: 7.9, y: 20 })).toBe(false);
        expect(thing.isSelected({ x: 10, y: 21.1 })).toBe(false);
    });

    it('should follow its position', () => {
        const thing = new MinimalSelectable();

        thing.position = { x: 0, y: 0 };

        expect(thing.isSelected({ x: 1, y: 0 })).toBe(true);
        expect(thing.isSelected({ x: 10, y: 20 })).toBe(false);
    });

    it('should change the value in place', () => {
        const thing = new MinimalSelectable();
        const label = thing.properties.get('Label');

        thing.updateProperty('Label', 'b');

        expect(thing.properties.get('Label')).toBe(label);
        expect(label?.value).toBe('b');
    });

    it('should refuse a field it does not have', () => {
        expect(() => new MinimalSelectable().updateProperty('Bus Width', 2)).toThrow('MinimalSelectable does not have property Bus Width');
    });

    it('should refuse a readonly property before looking at the value', () => {
        expect(() => new MinimalSelectable().updateProperty('Output Value', 'x')).toThrow('Output Value of MinimalSelectable is readonly');
    });

    it('should refuse a value the field does not accept, leaving the old one', () => {
        const thing = new MinimalSelectable();

        expect(() => thing.updateProperty('Label', 3)).toThrow('Label must be a string');
        expect(thing.properties.get('Label')?.value).toBe('a');
    });

    it('should let a subclass add to updateProperty', () => {
        const thing = new Watching();

        thing.updateProperty('Label', 'c');

        expect(thing.seen).toEqual(['c']);
    });

    it('should only let subclasses set a value without going through updateProperty', () => {
        const thing = new MinimalSelectable();
        // @ts-expect-error setPropertyValue is protected: outside code has to call updateProperty
        thing.setPropertyValue('Label', 'd');

        expect(thing.properties.get('Label')?.value).toBe('d');
    });

    it('should hand outside code properties it can read but not write', () => {
        const thing = new MinimalSelectable();
        const label = thing.properties.get('Label')!;

        expect(label.value).toBe('a');
        expect(label.isReadonly).toBe(false);
        expect(thing.properties.serialize()).toEqual({
            'Label': { value: 'a', readonly: false },
            'Output Value': { value: '0', readonly: true },
        });
        // Only the types stop this, so it is checked at compile time and never run.
        const writeOutside = () => {
            // @ts-expect-error a property's value is read-only outside its selectable: outside code has to call updateProperty
            label.value = 'b';
        };
        expect(writeOutside).toBeTypeOf('function');
        // @ts-expect-error the record can't be replaced either
        expect(() => thing.properties = new PropertyRecord({})).toThrow();
    });

    it('should not offer a way to swap a whole property', () => {
        expect('set' in new PropertyRecord({})).toBe(false);
    });
});

describe('BoundingBox', () => {
    it('should start at the owner\'s position unless told otherwise', () => {
        const box = new BoundingBox(6, 4);

        expect(box.top).toBe(0);
        expect(box.containsPoint({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(true);
        expect(box.containsPoint({ x: 16, y: 24 }, { x: 10, y: 20 })).toBe(true);
        expect(box.containsPoint({ x: 10, y: 19.9 }, { x: 10, y: 20 })).toBe(false);
    });

    it('should reach above the owner\'s position by its top', () => {
        const box = new BoundingBox(6, 8, -2);

        expect(box.containsPoint({ x: 12, y: 18 }, { x: 10, y: 20 })).toBe(true);
        expect(box.containsPoint({ x: 12, y: 26 }, { x: 10, y: 20 })).toBe(true);
        expect(box.containsPoint({ x: 12, y: 17.9 }, { x: 10, y: 20 })).toBe(false);
        expect(box.containsPoint({ x: 12, y: 26.1 }, { x: 10, y: 20 })).toBe(false);
    });

    it('should start left of the owner\'s position by its left', () => {
        const box = new BoundingBox(4, 6, -1, 1);

        expect(box.left).toBe(1);
        expect(box.containsPoint({ x: 11, y: 19 }, { x: 10, y: 20 })).toBe(true);
        expect(box.containsPoint({ x: 15, y: 25 }, { x: 10, y: 20 })).toBe(true);
        expect(box.containsPoint({ x: 10.9, y: 22 }, { x: 10, y: 20 })).toBe(false);
        expect(box.containsPoint({ x: 15.1, y: 22 }, { x: 10, y: 20 })).toBe(false);
    });
});
