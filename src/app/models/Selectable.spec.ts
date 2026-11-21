import { describe, it, expect } from 'vitest';
import { Property } from './Property';
import type { PropertyField, PropertyType } from './Property';
import { PropertyRecord } from './Property';
import { AbstractSelectable, BoundingBox } from './Selectable';

class Thing extends AbstractSelectable {
    properties = new PropertyRecord({ 'Label': new Property('a'), 'Output Value': new Property(0n, true) });
    /** What the override saw, to check that it runs after the value is set. */
    seen: PropertyType[] = [];

    protected readonly displayName = 'Thing';

    isSelected(): boolean {
        return false;
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(1, 1);
    }
}

class Watching extends Thing {
    override updateProperty(field: PropertyField, value: PropertyType): void {
        super.updateProperty(field, value);
        this.seen.push(this.properties.get(field)!.value);
    }
}

describe('AbstractSelectable', () => {
    it('should change the value in place', () => {
        const thing = new Thing();
        const label = thing.properties.get('Label');

        thing.updateProperty('Label', 'b');

        expect(thing.properties.get('Label')).toBe(label);
        expect(label?.value).toBe('b');
    });

    it('should refuse a field it does not have', () => {
        expect(() => new Thing().updateProperty('Bus Width', 2)).toThrow('Thing does not have property Bus Width');
    });

    it('should refuse a readonly property before looking at the value', () => {
        expect(() => new Thing().updateProperty('Output Value', 'x')).toThrow('Output Value of Thing is readonly');
    });

    it('should refuse a value the field does not accept, leaving the old one', () => {
        const thing = new Thing();

        expect(() => thing.updateProperty('Label', 3)).toThrow('Label must be a string');
        expect(thing.properties.get('Label')?.value).toBe('a');
    });

    it('should let a subclass add to updateProperty', () => {
        const thing = new Watching();

        thing.updateProperty('Label', 'c');

        expect(thing.seen).toEqual(['c']);
    });

    it('should only let subclasses set a value without going through updateProperty', () => {
        const thing = new Thing();
        // @ts-expect-error setPropertyValue is protected: outside code has to call updateProperty
        thing.setPropertyValue('Label', 'd');

        expect(thing.properties.get('Label')?.value).toBe('d');
    });
});
