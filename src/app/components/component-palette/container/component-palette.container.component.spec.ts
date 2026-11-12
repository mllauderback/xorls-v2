import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import type { MemoizedSelector } from '@ngrx/store';
import { ComponentPaletteContainerComponent } from './component-palette.container.component';
import { selectPaletteComponents } from '../../../store/components/feature';
import * as actions from '../../../store/components/actions';
import * as workspaceActions from '../../../store/workspace/actions';
import type { PaletteComponentRecord, PaletteComponentsState } from '../../../store/components/state';
import { PaletteComponentCategories } from '../../../store/components/state';
import type { PaletteComponent } from '../../../models/components/PaletteComponent';
import { ComponentPalettePresenterComponent } from '../presenter/component-palette.presenter.component';
import { SelectablePropertiesContainerComponent } from '../../selectable-properties/container/selectable-properties.container.component';
import { ComponentType } from '../../../models/components/Component';

@Component({ selector: 'app-component-palette-presenter', template: '<ng-content />', standalone: true })
class MockComponentPalettePresenterComponent {
    @Input() categoryPaletteComponents?: PaletteComponentRecord;
    @Output() categoryPaletteComponentsChange = new EventEmitter<PaletteComponentRecord>();
}

@Component({ selector: 'app-selectable-properties-container', template: '', standalone: true })
class MockSelectablePropertiesContainerComponent { }

const CATEGORY: PaletteComponentCategories = PaletteComponentCategories.gates;

/** Every action dispatched so far, oldest first. */
const dispatchedActions = (store: MockStore): { type: string }[] =>
    vi.mocked(store.dispatch).mock.calls.map(([action]) => action as unknown as { type: string });

const buildPaletteComponent = (overrides: Partial<PaletteComponent> = {}): PaletteComponent => ({
    type: ComponentType.AndGate,
    selected: false,
    ...overrides,
});

/** A palette with the given components in one category. The other categories are there but empty. */
const buildRecord = (components: PaletteComponent[]): PaletteComponentRecord => ({
    ...Object.fromEntries(Object.values(PaletteComponentCategories).map(category => [category, []])),
    [CATEGORY]: components,
} as PaletteComponentRecord);

const mockRecord = buildRecord([buildPaletteComponent()]);

describe('ComponentPaletteContainerComponent', () => {
    let store: MockStore;
    let fixture: ComponentFixture<ComponentPaletteContainerComponent>;
    let component: ComponentPaletteContainerComponent;
    let mockSelectPaletteComponents: MemoizedSelector<PaletteComponentsState, PaletteComponentRecord>;

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
        mockSelectPaletteComponents = store.overrideSelector(selectPaletteComponents, mockRecord);
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
        it('should select categoryPaletteComponents$ from the store', () => {
            let emittedValue: PaletteComponentRecord | undefined;
            component['categoryPaletteComponents$'].subscribe((val) => {
                emittedValue = val;
            });

            expect(emittedValue).toEqual(mockRecord);
        });

        it('should pass the record to the presenter when the store emits', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockComponentPalettePresenterComponent)
            ).componentInstance as MockComponentPalettePresenterComponent;

            expect(presenter.categoryPaletteComponents).toEqual(mockRecord);
        });

        it('should update the presenter when the store emits a new value', async () => {
            await fixture.whenStable();

            const updatedRecord = buildRecord([buildPaletteComponent({ type: ComponentType.OrGate })]);
            mockSelectPaletteComponents.setResult(updatedRecord);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockComponentPalettePresenterComponent)
            ).componentInstance as MockComponentPalettePresenterComponent;

            expect(presenter.categoryPaletteComponents).toEqual(updatedRecord);
        });
    });

    describe('loading state', () => {
        it('should show the presenter when the store emits a record', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(By.directive(MockComponentPalettePresenterComponent));
            expect(presenter).toBeTruthy();
        });

        it('should show the loading message before the store emits', async () => {
            store.overrideSelector(selectPaletteComponents, null as unknown as PaletteComponentRecord);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            const loading = fixture.debugElement.query(By.css('p'));
            expect(loading?.nativeElement.textContent).toBe('Loading component palette...');
        });

        it('should not show the presenter before the store emits', async () => {
            store.overrideSelector(selectPaletteComponents, null as unknown as PaletteComponentRecord);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(By.directive(MockComponentPalettePresenterComponent));
            expect(presenter).toBeNull();
        });
    });

    describe('updateCategoryPaletteComponents', () => {
        it('should dispatch setPaletteComponents with the emitted map', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockComponentPalettePresenterComponent)
            ).componentInstance as MockComponentPalettePresenterComponent;

            presenter.categoryPaletteComponentsChange.emit(mockRecord);

            expect(store.dispatch).toHaveBeenCalledWith(
                actions.setPaletteComponents({ paletteComponents: mockRecord })
            );
        });

        it('should dispatch setPaletteComponentMap exactly once per emission', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockComponentPalettePresenterComponent)
            ).componentInstance as MockComponentPalettePresenterComponent;

            presenter.categoryPaletteComponentsChange.emit(mockRecord);
            presenter.categoryPaletteComponentsChange.emit(mockRecord);

            const recordDispatches = dispatchedActions(store).filter(
                action => action.type === actions.setPaletteComponents.type
            );
            expect(recordDispatches).toHaveLength(2);
        });

        describe('when a palette component is selected', () => {
            const selectedRecord = buildRecord([
                buildPaletteComponent({ type: ComponentType.AndGate }),
                buildPaletteComponent({ type: ComponentType.OrGate, selected: true }),
            ]);

            const emitSelectedRecord = async () => {
                await fixture.whenStable();
                const presenter = fixture.debugElement.query(
                    By.directive(MockComponentPalettePresenterComponent)
                ).componentInstance as MockComponentPalettePresenterComponent;
                presenter.categoryPaletteComponentsChange.emit(selectedRecord);
            };

            const selectAction = () => {
                const action = dispatchedActions(store).find(a => a.type === actions.selectPaletteComponent.type);
                return action as ReturnType<typeof actions.selectPaletteComponent> | undefined;
            };

            it('should select the palette component', async () => {
                await emitSelectedRecord();
                expect(selectAction()?.paletteComponent).toEqual({ type: ComponentType.OrGate, selected: true });
            });

            it('should give the store its own copy of the palette component, because the palette changes its entries in place', async () => {
                await emitSelectedRecord();
                expect(selectAction()?.paletteComponent).not.toBe(selectedRecord[CATEGORY]![1]);
            });

            it('should not create the component itself: the workspace previews it from the class name', async () => {
                await emitSelectedRecord();
                expect(Object.keys(selectAction()!).sort()).toEqual(['paletteComponent', 'type']);
            });

            it('should switch the mouse to place mode', async () => {
                await emitSelectedRecord();
                expect(store.dispatch).toHaveBeenCalledWith(workspaceActions.updateMouseMode({ mode: 'place' }));
            });
        });

        describe('when the palette selection is toggled off', () => {
            it('should cancel the pending selection and switch the mouse back to select mode', async () => {
                await fixture.whenStable();
                const presenter = fixture.debugElement.query(
                    By.directive(MockComponentPalettePresenterComponent)
                ).componentInstance as MockComponentPalettePresenterComponent;

                presenter.categoryPaletteComponentsChange.emit(mockRecord); // nothing selected in mockRecord

                expect(store.dispatch).toHaveBeenCalledWith(actions.clearSelectedPaletteComponent());
                expect(store.dispatch).toHaveBeenCalledWith(workspaceActions.updateMouseMode({ mode: 'select' }));
                const selectDispatches = dispatchedActions(store).filter(
                    action => action.type === actions.selectPaletteComponent.type
                );
                expect(selectDispatches).toHaveLength(0);
            });
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