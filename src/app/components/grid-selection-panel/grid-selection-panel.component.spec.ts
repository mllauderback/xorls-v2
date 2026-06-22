import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { GridSelectionPanelComponent } from './grid-selection-panel.component';
import type { PaletteComponent } from '../../models/components/PaletteComponent';
import { PaletteComponentCategories } from '../../store/components/state';
import { PaletteComponentSvgsComponent } from '../responsive-svgs/palette-component-svgs/palette-component-svgs.component';
import { AndGate, OrGate } from '../../models/components/gates';

@Component({ selector: 'app-palette-component-svgs', template: '', standalone: true })
class MockPaletteComponentSvgsComponent {
    @Input() className?: string;
}

const buildPaletteComponent = (overrides: Partial<PaletteComponent> = {}): PaletteComponent => ({
    className: AndGate.name,
    selected: false,
    ...overrides,
});

const buildMap = (
    category: PaletteComponentCategories,
    components: PaletteComponent[]
): Map<PaletteComponentCategories, PaletteComponent[]> =>
    new Map([[category, components]]);

const CATEGORY: PaletteComponentCategories = PaletteComponentCategories.gates;


describe('GridSelectionPanelComponent', () => {
    let fixture: ComponentFixture<GridSelectionPanelComponent>;
    let component: GridSelectionPanelComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GridSelectionPanelComponent],
        })
            .overrideComponent(GridSelectionPanelComponent, {
                remove: { imports: [PaletteComponentSvgsComponent] },
                add: { imports: [MockPaletteComponentSvgsComponent] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(GridSelectionPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => vi.clearAllMocks());

    const setup = (
        components: PaletteComponent[],
        category: PaletteComponentCategories = CATEGORY
    ) => {
        component.categoryPaletteComponentMap = buildMap(category, components);
        component.category = category;
        fixture.detectChanges();
    };

    describe('rendering', () => {
        it('should render a checkbox and label for each palette component', () => {
            const components = [
                buildPaletteComponent({ className: AndGate.name }),
                buildPaletteComponent({ className: OrGate.name }),
            ];
            setup(components);

            const checkboxes = fixture.debugElement.queryAll(By.css('.grid-selection-checkbox'));
            const labels = fixture.debugElement.queryAll(By.css('.grid-selection-label'));

            expect(checkboxes).toHaveLength(2);
            expect(labels).toHaveLength(2);
        });

        it('should render a checked checkbox for a selected component', () => {
            const components = [buildPaletteComponent({ className: AndGate.name, selected: true })];
            setup(components);

            const checkbox = fixture.debugElement.query(By.css('.grid-selection-checkbox'));
            expect(checkbox.nativeElement.checked).toBe(true);
        });

        it('should render an unchecked checkbox for an unselected component', () => {
            const components = [buildPaletteComponent({ className: AndGate.name, selected: false })];
            setup(components);

            const checkbox = fixture.debugElement.query(By.css('.grid-selection-checkbox'));
            expect(checkbox.nativeElement.checked).toBe(false);
        });

        it('should bind the label for attribute to the component className', () => {
            const components = [buildPaletteComponent({ className: AndGate.name })];
            setup(components);

            const label = fixture.debugElement.query(By.css('.grid-selection-label'));
            expect(label.nativeElement.getAttribute('for')).toBe(AndGate.name);
        });

        it('should render nothing when the category has no components', () => {
            setup([]);

            const checkboxes = fixture.debugElement.queryAll(By.css('.grid-selection-checkbox'));
            expect(checkboxes).toHaveLength(0);
        });
    });

    describe('select', () => {
        it('should emit categoryPaletteComponentMapChange when a component is selected', () => {
            const components = [buildPaletteComponent({ className: AndGate.name, selected: false })];
            setup(components);
            const emitSpy = vi.spyOn(component.categoryPaletteComponentMapChange, 'emit');

            const checkbox = fixture.debugElement.query(By.css('.grid-selection-checkbox'));
            checkbox.nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            expect(emitSpy).toHaveBeenCalledTimes(1);
        });

        it('should emit a map with the clicked component selected when it was not selected', () => {
            const components = [
                buildPaletteComponent({ className: AndGate.name, selected: false }),
                buildPaletteComponent({ className: OrGate.name, selected: false }),
            ];
            setup(components);
            const emitSpy = vi.spyOn(component.categoryPaletteComponentMapChange, 'emit');

            const checkboxes = fixture.debugElement.queryAll(By.css('.grid-selection-checkbox'));
            checkboxes[0].nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            const emittedMap: Map<PaletteComponentCategories, PaletteComponent[]> | undefined = emitSpy.mock.calls[0][0];
            const emittedComponents = emittedMap?.get(CATEGORY);
            expect(emittedComponents![0].selected).toBe(true);
            expect(emittedComponents![1].selected).toBe(false);
        });

        it('should clear all selections before selecting the new component', () => {
            const components = [
                buildPaletteComponent({ className: AndGate.name, selected: true }),
                buildPaletteComponent({ className: OrGate.name, selected: false }),
            ];
            setup(components);
            const emitSpy = vi.spyOn(component.categoryPaletteComponentMapChange, 'emit');

            const checkboxes = fixture.debugElement.queryAll(By.css('.grid-selection-checkbox'));
            checkboxes[1].nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            const emittedMap: Map<PaletteComponentCategories, PaletteComponent[]> | undefined = emitSpy.mock.calls[0][0];
            const emittedComponents = emittedMap?.get(CATEGORY);
            expect(emittedComponents![0].selected).toBe(false);
            expect(emittedComponents![1].selected).toBe(true);
        });

        it('should deselect a component and clear all selections when clicking an already selected component', () => {
            const components = [
                buildPaletteComponent({ className: AndGate.name, selected: true }),
                buildPaletteComponent({ className: OrGate.name, selected: false }),
            ];
            setup(components);
            const emitSpy = vi.spyOn(component.categoryPaletteComponentMapChange, 'emit');

            const checkboxes = fixture.debugElement.queryAll(By.css('.grid-selection-checkbox'));
            checkboxes[0].nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            const emittedMap: Map<PaletteComponentCategories, PaletteComponent[]> | undefined = emitSpy.mock.calls[0][0];
            const emittedComponents = emittedMap?.get(CATEGORY);
            expect(emittedComponents![0].selected).toBe(false);
            expect(emittedComponents![1].selected).toBe(false);
        });

        it('should emit a deep copy and not mutate the original map', () => {
            const components = [buildPaletteComponent({ className: AndGate.name, selected: false })];
            const originalMap = buildMap(CATEGORY, components);
            setup(components);
            const emitSpy = vi.spyOn(component.categoryPaletteComponentMapChange, 'emit');
            component.categoryPaletteComponentMap = originalMap;

            const checkboxes = fixture.debugElement.queryAll(By.css('.grid-selection-checkbox'));
            checkboxes[0].nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

            const emittedMap = emitSpy.mock.calls[0][0];
            expect(emittedMap).not.toBe(originalMap);
            expect(originalMap.get(CATEGORY)![0].selected).toBe(false);
        });

        it('should prevent the default checkbox toggle behaviour', () => {
            const components = [buildPaletteComponent({ className: AndGate.name, selected: false })];
            setup(components);

            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            const checkbox = fixture.debugElement.query(By.css('.grid-selection-checkbox'));
            checkbox.nativeElement.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
        });

        it('should not emit if categoryPaletteComponentMap is undefined', () => {
            setup([]);
            component.categoryPaletteComponentMap = undefined;
            const emitSpy = vi.spyOn(component.categoryPaletteComponentMapChange, 'emit');
            fixture.detectChanges();

            component.select(new MouseEvent('click'), buildPaletteComponent());

            expect(emitSpy).not.toHaveBeenCalled();
        });

        it('should not emit if category is undefined', () => {
            setup([]);
            component.category = undefined;
            const emitSpy = vi.spyOn(component.categoryPaletteComponentMapChange, 'emit');
            fixture.detectChanges();

            component.select(new MouseEvent('click'), buildPaletteComponent());

            expect(emitSpy).not.toHaveBeenCalled();
        });
    });
});