import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { describe, beforeEach, it, expect } from 'vitest';

import type { PropertyChange } from './selectable-properties.presenter.component';
import { SelectablePropertiesPresenterComponent } from './selectable-properties.presenter.component';
import { ComponentType } from '../../../models/components/Component';
import { AndGate } from '../../../models/components/gates';
import { Input } from '../../../models/components/io';
import { PROPERTY_DEFINITIONS, toOrderedList } from '../../../models/Property';
import type { PropertyListItem } from '../../../models/Property';

/** PrimeNG's scroll panel measures its content to size its scroll bars, which the test DOM can't do (calc(NaN%)). */
// eslint-disable-next-line @angular-eslint/component-selector -- it has to match the selector of the component it replaces
@Component({ selector: 'p-scrollpanel', template: '<ng-content />' })
class StubScrollPanelComponent { }

describe('SelectablePropertiesComponent', () => {
    let component: SelectablePropertiesPresenterComponent;
    let fixture: ComponentFixture<SelectablePropertiesPresenterComponent>;
    let changes: PropertyChange[];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SelectablePropertiesPresenterComponent]
        })
            .overrideComponent(SelectablePropertiesPresenterComponent, {
                set: { imports: [FormsModule, CheckboxModule, DividerModule, InputNumberModule, InputTextModule, SelectModule, StubScrollPanelComponent] }
            })
            .compileComponents();

        fixture = TestBed.createComponent(SelectablePropertiesPresenterComponent);
        component = fixture.componentInstance;
        changes = [];
        component.propertyChange.subscribe(change => changes.push(change));
        fixture.detectChanges();
    });

    function show(type: string | null, properties: PropertyListItem[]) {
        fixture.componentRef.setInput('type', type);
        fixture.componentRef.setInput('properties', properties);
        fixture.detectChanges();
    }
    function row(id: string) {
        return fixture.debugElement.query(By.css(`[data-testid="${id}"]`));
    }
    const label: PropertyListItem = { field: 'Label', value: 'clk', readonly: false, definition: PROPERTY_DEFINITIONS['Label'] };

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should say nothing is selected when no properties are shown', () => {
        show(null, []);

        expect(fixture.nativeElement.textContent).toContain('Nothing is selected.');
    });

    it('should show the kind of component the properties belong to', () => {
        show(ComponentType.AndGate, []);

        expect(fixture.nativeElement.textContent).toContain('AndGate Properties');
        expect(fixture.nativeElement.textContent).not.toContain('Nothing is selected.');
    });

    it('should list the properties in the order it is given them, each with its label', () => {
        show(ComponentType.Input, toOrderedList(new Input({ x: 0, y: 0 }).properties.serialize()));

        const labels = fixture.debugElement.queryAll(By.css('.property label')).map(l => l.nativeElement.textContent.trim());
        expect(labels).toEqual(['Orientation', 'Output Value', 'Bus Width', 'Label']);
    });

    it('should pick the editor that fits each kind of property', () => {
        show(ComponentType.Input, [
            ...toOrderedList(new Input({ x: 0, y: 0 }).properties.serialize()),
            { field: 'Number of Inputs', value: true, readonly: false, definition: { kind: 'boolean' } },
        ]);

        expect(row('property-orientation').query(By.css('p-select'))).toBeTruthy();
        expect(row('property-output-value').query(By.css('p-inputnumber'))).toBeTruthy();
        expect(row('property-bus-width').query(By.css('p-inputnumber'))).toBeTruthy();
        expect(row('property-label').query(By.css('input[pInputText]'))).toBeTruthy();
        expect(row('property-number-of-inputs').query(By.css('p-checkbox'))).toBeTruthy();
    });

    it('should show the buttons of a number field and its range', () => {
        show(ComponentType.AndGate, toOrderedList(new AndGate({ x: 0, y: 0 }, 2).properties.serialize()));

        const field = row('property-number-of-inputs').query(By.css('p-inputnumber'));
        expect(field.queryAll(By.css('button')).length).toBe(2);
        expect(field.query(By.css('input')).nativeElement.getAttribute('aria-valuemin')).toBe('2');
        expect(field.query(By.css('input')).nativeElement.getAttribute('aria-valuemax')).toBe('32');
    });

    it('should disable the editor of a readonly property', async () => {
        show(ComponentType.AndGate, toOrderedList(new AndGate({ x: 0, y: 0 }, 2).properties.serialize()));
        await fixture.whenStable();
        fixture.detectChanges();

        expect(row('property-output-value').query(By.css('input')).nativeElement.disabled).toBe(true);
        expect(row('property-number-of-inputs').query(By.css('input')).nativeElement.disabled).toBe(false);
    });

    describe('edits', () => {
        it('should report a text field when it loses focus or Enter is pressed', () => {
            show(ComponentType.Input, [label]);
            const input: HTMLInputElement = row('property-label').query(By.css('input')).nativeElement;

            input.value = 'reset';
            input.dispatchEvent(new Event('blur'));
            input.value = 'reset2';
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

            expect(changes).toEqual([{ field: 'Label', value: 'reset' }, { field: 'Label', value: 'reset2' }]);
        });

        it('should not report a text field that did not change', () => {
            show(ComponentType.Input, [label]);

            row('property-label').query(By.css('input')).nativeElement.dispatchEvent(new Event('blur'));

            expect(changes).toEqual([]);
        });

        it('should report a number as a number', () => {
            show(ComponentType.AndGate, toOrderedList(new AndGate({ x: 0, y: 0 }, 2).properties.serialize()));

            row('property-number-of-inputs').query(By.css('p-inputnumber')).triggerEventHandler('ngModelChange', 3);

            expect(changes).toEqual([{ field: 'Number of Inputs', value: 3 }]);
        });

        it('should report a bigint as its decimal string', () => {
            show(ComponentType.Input, toOrderedList(new Input({ x: 0, y: 0 }).properties.serialize()));

            row('property-output-value').query(By.css('p-inputnumber')).triggerEventHandler('ngModelChange', 255);

            expect(changes).toEqual([{ field: 'Output Value', value: '255' }]);
        });

        it('should not report a cleared number field', () => {
            show(ComponentType.AndGate, toOrderedList(new AndGate({ x: 0, y: 0 }, 2).properties.serialize()));

            row('property-number-of-inputs').query(By.css('p-inputnumber')).triggerEventHandler('ngModelChange', null);

            expect(changes).toEqual([]);
        });

        it('should report the option picked in a dropdown', () => {
            show(ComponentType.AndGate, toOrderedList(new AndGate({ x: 0, y: 0 }, 2).properties.serialize()));

            row('property-orientation').query(By.css('p-select')).triggerEventHandler('ngModelChange', 'South');

            expect(changes).toEqual([{ field: 'Orientation', value: 'South' }]);
        });

        it('should report a checkbox', () => {
            show(ComponentType.Input, [{ field: 'Label', value: false, readonly: false, definition: { kind: 'boolean' } }]);

            row('property-label').query(By.css('p-checkbox')).triggerEventHandler('ngModelChange', true);

            expect(changes).toEqual([{ field: 'Label', value: true }]);
        });

        it('should never report a readonly property', () => {
            show(ComponentType.AndGate, toOrderedList(new AndGate({ x: 0, y: 0 }, 2).properties.serialize()));

            row('property-output-value').query(By.css('p-inputnumber')).triggerEventHandler('ngModelChange', 1);

            expect(changes).toEqual([]);
        });
    });
});
