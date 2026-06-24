import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import type { MemoizedSelector } from '@ngrx/store';
import { ComponentPaletteContainerComponent } from './component-palette.container.component';
import { selectPaletteComponentMap } from '../../../store/components/feature';
import * as actions from '../../../store/components/actions';
import type { PaletteComponentsState } from '../../../store/components/state';
import { PaletteComponentCategories } from '../../../store/components/state';
import type { PaletteComponent } from '../../../models/components/PaletteComponent';
import { ComponentPalettePresenterComponent } from '../presenter/component-palette.presenter.component';
import { SelectablePropertiesContainerComponent } from '../../selectable-properties/container/selectable-properties.container.component';
import { AndGate, OrGate } from '../../../models/components/gates';

@Component({ selector: 'app-component-palette-presenter', template: '<ng-content />', standalone: true })
class MockComponentPalettePresenterComponent {
    @Input() categoryPaletteComponentMap?: Map<PaletteComponentCategories, PaletteComponent[]>;
    @Output() categoryPaletteComponentMapChange = new EventEmitter<Map<PaletteComponentCategories, PaletteComponent[]>>();
}

@Component({ selector: 'app-selectable-properties-container', template: '', standalone: true })
class MockSelectablePropertiesContainerComponent {}

const CATEGORY: PaletteComponentCategories = PaletteComponentCategories.gates;

const buildPaletteComponent = (overrides: Partial<PaletteComponent> = {}): PaletteComponent => ({
    className: AndGate.name,
    selected: false,
    ...overrides,
});

const mockMap = new Map<PaletteComponentCategories, PaletteComponent[]>([
    [CATEGORY, [buildPaletteComponent()]],
]);

describe('ComponentPaletteContainerComponent', () => {
    let store: MockStore;
    let fixture: ComponentFixture<ComponentPaletteContainerComponent>;
    let component: ComponentPaletteContainerComponent;
    let mockSelectPaletteComponentMap: MemoizedSelector<PaletteComponentsState, Map<PaletteComponentCategories, PaletteComponent[]>>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ComponentPaletteContainerComponent],
            providers: [provideMockStore()],
        })
        .overrideComponent(ComponentPaletteContainerComponent, {
            remove: {
                imports: [
                    ComponentPalettePresenterComponent,
                    SelectablePropertiesContainerComponent
                ]
            },
            add: {
                imports: [
                    MockComponentPalettePresenterComponent,
                    MockSelectablePropertiesContainerComponent,
                ],
            },
        })
        .compileComponents();

        store = TestBed.inject(MockStore);
        mockSelectPaletteComponentMap = store.overrideSelector(selectPaletteComponentMap, mockMap);
        vi.spyOn(store, 'dispatch');

        fixture = TestBed.createComponent(ComponentPaletteContainerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => vi.clearAllMocks());

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('store selection', () => {
        it('should select categoryPaletteComponentMap$ from the store', () => {
            let emittedValue: Map<PaletteComponentCategories, PaletteComponent[]> | undefined;
            component['categoryPaletteComponentMap$'].subscribe((val) => {
                emittedValue = val;
            });

            expect(emittedValue).toEqual(mockMap);
        });

        it('should pass the map to the presenter when the store emits', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockComponentPalettePresenterComponent)
            ).componentInstance as MockComponentPalettePresenterComponent;

            expect(presenter.categoryPaletteComponentMap).toEqual(mockMap);
        });

        it('should update the presenter when the store emits a new value', async () => {
            await fixture.whenStable();

            const updatedMap = new Map<PaletteComponentCategories, PaletteComponent[]>([
                [CATEGORY, [buildPaletteComponent({ className: OrGate.name })]],
            ]);
            mockSelectPaletteComponentMap.setResult(updatedMap);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockComponentPalettePresenterComponent)
            ).componentInstance as MockComponentPalettePresenterComponent;

            expect(presenter.categoryPaletteComponentMap).toEqual(updatedMap);
        });
    });

    describe('loading state', () => {
        it('should show the presenter when the store emits a map', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(By.directive(MockComponentPalettePresenterComponent));
            expect(presenter).toBeTruthy();
        });

        it('should show the loading message before the store emits', async () => {
            store.overrideSelector(selectPaletteComponentMap, null as unknown as Map<PaletteComponentCategories, PaletteComponent[]>);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            const loading = fixture.debugElement.query(By.css('p'));
            expect(loading?.nativeElement.textContent).toBe('Loading component palette...');
        });

        it('should not show the presenter before the store emits', async () => {
            store.overrideSelector(selectPaletteComponentMap, null as unknown as Map<PaletteComponentCategories, PaletteComponent[]>);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(By.directive(MockComponentPalettePresenterComponent));
            expect(presenter).toBeNull();
        });
    });

    describe('updateCategoryPaletteComponentMap', () => {
        it('should dispatch setPaletteComponentMap with the emitted map', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockComponentPalettePresenterComponent)
            ).componentInstance as MockComponentPalettePresenterComponent;

            presenter.categoryPaletteComponentMapChange.emit(mockMap);

            expect(store.dispatch).toHaveBeenCalledWith(
                actions.setPaletteComponentMap({ paletteComponentMap: mockMap })
            );
        });

        it('should dispatch exactly once per emission', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockComponentPalettePresenterComponent)
            ).componentInstance as MockComponentPalettePresenterComponent;

            presenter.categoryPaletteComponentMapChange.emit(mockMap);
            presenter.categoryPaletteComponentMapChange.emit(mockMap);

            expect(store.dispatch).toHaveBeenCalledTimes(2);
        });
    });

    describe('content projection', () => {
        it('should project app-selectable-properties-container into the presenter', async () => {
            await fixture.whenStable();

            const projected = fixture.debugElement.query(
                By.directive(MockSelectablePropertiesContainerComponent)
            );

            expect(projected).toBeTruthy();
        });
    });
});