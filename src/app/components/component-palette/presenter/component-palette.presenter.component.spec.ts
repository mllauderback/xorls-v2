import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentPalettePresenterComponent } from './component-palette.presenter.component';
import type { PaletteComponent } from '../../../models/components/PaletteComponent';
import { PaletteComponentCategories } from '../../../store/components/state';
import { GridSelectionPanelComponent } from '../../grid-selection-panel/grid-selection-panel.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AndGate } from '../../../models/components/gates';
import { Input as IoInput } from '../../../models/components/io';
import { Text } from '../../../models/components/decorations';

@Component({ selector: 'app-grid-selection-panel', template: '', standalone: true })
class MockGridSelectionPanelComponent {
    @Input() categoryPaletteComponentMap?: Map<PaletteComponentCategories, PaletteComponent[]>;
    @Input() category?: PaletteComponentCategories;
    @Output() categoryPaletteComponentMapChange = new EventEmitter<Map<PaletteComponentCategories, PaletteComponent[]>>();
}

const GATES_CATEGORY: PaletteComponentCategories = PaletteComponentCategories.gates;
const IO_CATEGORY: PaletteComponentCategories = PaletteComponentCategories.io;
const DECORATIONS_CATEGORY: PaletteComponentCategories = PaletteComponentCategories.decorations;

const buildPaletteComponent = (overrides: Partial<PaletteComponent> = {}): PaletteComponent => ({
    className: AndGate.name,
    selected: false,
    ...overrides,
});

const buildMap = (
    entries: [PaletteComponentCategories, PaletteComponent[]][]
): Map<PaletteComponentCategories, PaletteComponent[]> => new Map(entries);

describe('ComponentPalettePresenterComponent content projection', () => {
    @Component({
        selector: 'app-test-host',
        template: `
            <app-component-palette-presenter>
                <div propertiesPanel class="projected-content">properties</div>
            </app-component-palette-presenter>
        `,
        standalone: true,
        imports: [ComponentPalettePresenterComponent],
    })
    class TestHostComponent { }

    beforeEach(async () => {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [TestHostComponent],
        })
            .overrideComponent(ComponentPalettePresenterComponent, {
                remove: { imports: [GridSelectionPanelComponent] },
                add: { imports: [MockGridSelectionPanelComponent] },
            })
            .compileComponents();
    });

    it('should project content into the properties panel slot', () => {
        const hostFixture = TestBed.createComponent(TestHostComponent);
        hostFixture.detectChanges();

        const projected = hostFixture.debugElement.query(By.css('.projected-content'));
        expect(projected).toBeTruthy();
        expect(projected.nativeElement.textContent).toBe('properties');
    });
});

describe('ComponentPalettePresenterComponent', () => {
    let fixture: ComponentFixture<ComponentPalettePresenterComponent>;
    let component: ComponentPalettePresenterComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentPalettePresenterComponent],
            providers: [provideAnimationsAsync()],
            schemas: [NO_ERRORS_SCHEMA]
        })
            .overrideComponent(ComponentPalettePresenterComponent, {
                remove: { imports: [GridSelectionPanelComponent] },
                add: { imports: [MockGridSelectionPanelComponent] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(ComponentPalettePresenterComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => vi.clearAllMocks());

    describe('rendering', () => {
        it('should render an accordion panel for each category', () => {
            component.categoryPaletteComponentMap = buildMap([
                [GATES_CATEGORY, [buildPaletteComponent()]],
                [IO_CATEGORY, [buildPaletteComponent({ className: IoInput.name })]],
                [DECORATIONS_CATEGORY, [buildPaletteComponent({ className: Text.name })]]
            ]);
            fixture.detectChanges();

            const panels = fixture.debugElement.queryAll(By.css('p-accordion-panel'));
            expect(panels).toHaveLength(3);
        });

        it('should render the category name in each accordion header', () => {
            component.categoryPaletteComponentMap = buildMap([
                [GATES_CATEGORY, [buildPaletteComponent()]],
                [IO_CATEGORY, [buildPaletteComponent()]],
                [DECORATIONS_CATEGORY, [buildPaletteComponent()]]
            ]);
            fixture.detectChanges();

            const headers = fixture.debugElement.queryAll(By.css('p-accordion-header'));
            expect(headers[0].nativeElement.textContent).toEqual(GATES_CATEGORY);
            expect(headers[1].nativeElement.textContent).toEqual(IO_CATEGORY);
            expect(headers[2].nativeElement.textContent).toEqual(DECORATIONS_CATEGORY);
        });

        it('should render a grid selection panel for each category', () => {
            component.categoryPaletteComponentMap = buildMap([
                [GATES_CATEGORY, [buildPaletteComponent()]],
                [IO_CATEGORY, [buildPaletteComponent()]],
                [DECORATIONS_CATEGORY, [buildPaletteComponent()]]
            ]);
            fixture.detectChanges();

            const panels = fixture.debugElement.queryAll(By.directive(MockGridSelectionPanelComponent));
            expect(panels).toHaveLength(3);
        });

        it('should pass the map to each grid selection panel', () => {
            const map = buildMap([[GATES_CATEGORY, [buildPaletteComponent()]]]);
            component.categoryPaletteComponentMap = map;
            fixture.detectChanges();

            const panel = fixture.debugElement.query(
                By.directive(MockGridSelectionPanelComponent)
            ).componentInstance as MockGridSelectionPanelComponent;

            expect(panel.categoryPaletteComponentMap).toEqual(map);
        });

        it('should pass the correct category to each grid selection panel', () => {
            component.categoryPaletteComponentMap = buildMap([
                [GATES_CATEGORY, [buildPaletteComponent()]],
                [IO_CATEGORY, [buildPaletteComponent()]],
                [DECORATIONS_CATEGORY, [buildPaletteComponent()]]
            ]);
            fixture.detectChanges();

            const panels = fixture.debugElement.queryAll(
                By.directive(MockGridSelectionPanelComponent)
            ).map(p => p.componentInstance as MockGridSelectionPanelComponent);

            expect(panels[0].category).toBe(GATES_CATEGORY);
            expect(panels[1].category).toBe(IO_CATEGORY);
            expect(panels[2].category).toBe(DECORATIONS_CATEGORY);
        });

        it('should render no accordion panels when map is empty', () => {
            component.categoryPaletteComponentMap = buildMap([]);
            fixture.detectChanges();

            const panels = fixture.debugElement.queryAll(By.css('p-accordion-panel'));
            expect(panels).toHaveLength(0);
        });

        it('should render no accordion panels when map is undefined', () => {
            component.categoryPaletteComponentMap = undefined;
            fixture.detectChanges();

            const panels = fixture.debugElement.queryAll(By.css('p-accordion-panel'));
            expect(panels).toHaveLength(0);
        });
    });

    describe('categoryPaletteComponentMapChange', () => {
        it('should emit categoryPaletteComponentMapChange when the grid selection panel emits', () => {
            const map = buildMap([[GATES_CATEGORY, [buildPaletteComponent()]]]);
            component.categoryPaletteComponentMap = map;
            fixture.detectChanges();

            const emitSpy = vi.spyOn(component.categoryPaletteComponentMapChange, 'emit');

            const updatedMap = buildMap([[GATES_CATEGORY, [buildPaletteComponent({ selected: true })]]]);
            const panel = fixture.debugElement.query(
                By.directive(MockGridSelectionPanelComponent)
            ).componentInstance as MockGridSelectionPanelComponent;

            panel.categoryPaletteComponentMapChange.emit(updatedMap);

            expect(emitSpy).toHaveBeenCalledWith(updatedMap);
        });

        it('should emit exactly once per grid selection panel emission', () => {
            const map = buildMap([[GATES_CATEGORY, [buildPaletteComponent()]]]);
            component.categoryPaletteComponentMap = map;
            fixture.detectChanges();

            const emitSpy = vi.spyOn(component.categoryPaletteComponentMapChange, 'emit');

            const panel = fixture.debugElement.query(
                By.directive(MockGridSelectionPanelComponent)
            ).componentInstance as MockGridSelectionPanelComponent;

            panel.categoryPaletteComponentMapChange.emit(map);
            panel.categoryPaletteComponentMapChange.emit(map);

            expect(emitSpy).toHaveBeenCalledTimes(2);
        });

        it('should update categoryPaletteComponentMap via two-way binding when grid selection panel emits', () => {
            const map = buildMap([[GATES_CATEGORY, [buildPaletteComponent()]]]);
            component.categoryPaletteComponentMap = map;
            fixture.detectChanges();

            const updatedMap = buildMap([[GATES_CATEGORY, [buildPaletteComponent({ selected: true })]]]);
            const panel = fixture.debugElement.query(
                By.directive(MockGridSelectionPanelComponent)
            ).componentInstance as MockGridSelectionPanelComponent;

            panel.categoryPaletteComponentMapChange.emit(updatedMap);
            fixture.detectChanges();

            expect(component.categoryPaletteComponentMap).toEqual(updatedMap);
        });
    });
});