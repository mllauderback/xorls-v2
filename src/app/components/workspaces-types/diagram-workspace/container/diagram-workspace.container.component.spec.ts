import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom } from 'rxjs';

import { DiagramWorkspaceContainerComponent } from './diagram-workspace.container.component';
import { DiagramWorkspacePresenterComponent } from '../presenter/diagram-workspace.presenter.component';
import { selectWorkspaceSettings } from '../../../../store/settings/feature';
import { selectDiagramWorkspaceState } from '../../../../store/workspace/feature';
import { selectSelectedPaletteComponent, selectSelectedSelectable } from '../../../../store/components/feature';
import * as componentActions from '../../../../store/components/actions';
import * as workspaceActions from '../../../../store/workspace/actions';
import type { SelectedSelectable } from '../../../../store/components/state';
import { AndGate } from '../../../../models/components/gates';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { CodeWorkspaceState, DiagramWorkspaceState } from '../../../../store/workspace/state';

@Component({
    selector: 'app-diagram-workspace-presenter',
    template: '',
})
class MockDiagramWorkspacePresenterComponent {
    @Input({ required: true }) id!: string;
    @Input({ required: true }) workspaceSettings!: WorkspaceSettingsState | null;
    @Input({ required: true }) workspaceState!: DiagramWorkspaceState | CodeWorkspaceState | null;
    @Input() selectedSelectable: SelectedSelectable | null = null;
    @Output() componentPlaced = new EventEmitter<void>();
    @Output() selectionCleared = new EventEmitter<void>();
}

const mockSettings: WorkspaceSettingsState = {} as unknown as WorkspaceSettingsState;

const mockWorkspaceState: DiagramWorkspaceState = {
    mouseMode: 'select',
    mousePosition: { x: 0, y: 0 },
};

const mockSelectedSelectable: SelectedSelectable = { selectable: null, concreteClassName: '' };

describe('DiagramWorkspaceContainerComponent', () => {
    let component: DiagramWorkspaceContainerComponent;
    let fixture: ComponentFixture<DiagramWorkspaceContainerComponent>;
    let store: MockStore;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DiagramWorkspaceContainerComponent],
            providers: [
                provideMockStore({
                    selectors: [
                        { selector: selectWorkspaceSettings, value: mockSettings },
                        { selector: selectDiagramWorkspaceState, value: mockWorkspaceState },
                        { selector: selectSelectedSelectable, value: mockSelectedSelectable },
                        { selector: selectSelectedPaletteComponent, value: null },
                    ],
                }),
            ],
        })
            .overrideComponent(DiagramWorkspaceContainerComponent, {
                remove: { imports: [DiagramWorkspacePresenterComponent] },
                add: { imports: [MockDiagramWorkspacePresenterComponent] },
            })
            .compileComponents();

        store = TestBed.inject(MockStore);
        fixture = TestBed.createComponent(DiagramWorkspaceContainerComponent);
        component = fixture.componentInstance;
        component.id = 'test-diagram-id';
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('id input', () => {
        it('should accept and store the required id input', () => {
            expect(component.id).toBe('test-diagram-id');
        });
    });

    describe('workspaceSettings$', () => {
        it('should emit the value from the settings selector', async () => {
            const settings = await firstValueFrom(component['workspaceSettings$']);
            expect(settings).toEqual(mockSettings);
        });

        it('should filter out null values', async () => {
            store.overrideSelector(selectWorkspaceSettings, null as unknown as WorkspaceSettingsState);
            store.refreshState();

            let emitted = false;
            component['workspaceSettings$'].subscribe(() => { emitted = true; });
            await Promise.resolve();
            expect(emitted).toBe(false);
        });

        it('should filter out undefined values', async () => {
            store.overrideSelector(selectWorkspaceSettings, undefined as unknown as WorkspaceSettingsState);
            store.refreshState();

            let emitted = false;
            component['workspaceSettings$'].subscribe(() => { emitted = true; });
            await Promise.resolve();
            expect(emitted).toBe(false);
        });

        it('should emit updated settings when the store emits a new value', async () => {
            const updatedSettings = { updated: true } as unknown as WorkspaceSettingsState;
            store.overrideSelector(selectWorkspaceSettings, updatedSettings);
            store.refreshState();

            const settings = await firstValueFrom(component['workspaceSettings$']);
            expect(settings).toEqual(updatedSettings);
        });
    });

    describe('workspaceState$', () => {
        it('should emit the value from the workspace selector', async () => {
            const state = await firstValueFrom(component['workspaceState$']);
            expect(state).toEqual(mockWorkspaceState);
        });

        it('should filter out null values', async () => {
            store.overrideSelector(selectDiagramWorkspaceState, null as unknown as DiagramWorkspaceState);
            store.refreshState();

            let emitted = false;
            component['workspaceState$'].subscribe(() => { emitted = true; });
            await Promise.resolve();
            expect(emitted).toBe(false);
        });

        it('should filter out undefined values', async () => {
            store.overrideSelector(selectDiagramWorkspaceState, undefined as unknown as DiagramWorkspaceState);
            store.refreshState();

            let emitted = false;
            component['workspaceState$'].subscribe(() => { emitted = true; });
            await Promise.resolve();
            expect(emitted).toBe(false);
        });

        it('should emit updated state when the store emits a new value', async () => {
            const updatedState: DiagramWorkspaceState = { mouseMode: 'pan', mousePosition: { x: 10, y: 20 } };
            store.overrideSelector(selectDiagramWorkspaceState, updatedState);
            store.refreshState();

            const state = await firstValueFrom(component['workspaceState$']);
            expect(state).toEqual(updatedState);
        });
    });

    describe('template', () => {
        const getPresenter = (f: ComponentFixture<DiagramWorkspaceContainerComponent>) =>
            f.debugElement.query(By.directive(MockDiagramWorkspacePresenterComponent))
                .componentInstance as MockDiagramWorkspacePresenterComponent;

        it('should render the presenter component', () => {
            const presenter = fixture.debugElement.query(By.directive(MockDiagramWorkspacePresenterComponent));
            expect(presenter).toBeTruthy();
        });

        it('should pass the id input to the presenter', () => {
            expect(getPresenter(fixture).id).toBe('test-diagram-id');
        });

        it('should pass workspaceSettings to the presenter via async pipe', async () => {
            await fixture.whenStable();
            expect(getPresenter(fixture).workspaceSettings).toEqual(mockSettings);
        });

        it('should pass workspaceState to the presenter via async pipe', async () => {
            await fixture.whenStable();
            expect(getPresenter(fixture).workspaceState).toEqual(mockWorkspaceState);
        });

        it('should retain the last non-null workspaceState on the presenter when the selector emits null', async () => {
            store.overrideSelector(selectDiagramWorkspaceState, null as unknown as DiagramWorkspaceState);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            // the filter() in the constructor blocks null from reaching the async pipe,
            // so the presenter keeps the last valid emission rather than receiving null
            expect(getPresenter(fixture).workspaceState).toEqual(mockWorkspaceState);
        });
        it('should retain the last non-null settings on the presenter when the selector emits null', async () => {
            store.overrideSelector(selectWorkspaceSettings, null as unknown as WorkspaceSettingsState);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            // the filter() in the constructor blocks null from reaching the async pipe,
            // so the presenter keeps the last valid emission rather than receiving null
            expect(getPresenter(fixture).workspaceSettings).toEqual(mockSettings);
        });

        it('should update the presenter workspaceState when the store emits a new value', async () => {
            const updatedState: DiagramWorkspaceState = { mouseMode: 'place', mousePosition: { x: 5, y: 15 } };
            store.overrideSelector(selectDiagramWorkspaceState, updatedState);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(getPresenter(fixture).workspaceState).toEqual(updatedState);
        });

        it('should update the presenter workspaceSettingsState when the store emits a new value', async () => {
            const updatedSettings: WorkspaceSettingsState = {
                gridSettings: {
                    gridSpacing: 10,
                    gridMode: 'lines'
                }
            };
            store.overrideSelector(selectWorkspaceSettings, updatedSettings);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(getPresenter(fixture).workspaceSettings).toEqual(updatedSettings);
        });
    });
    describe('selectedSelectable$', () => {
        it('should emit the value from the selected selectable selector', async () => {
            expect(await firstValueFrom(component['selectedSelectable$'])).toEqual(mockSelectedSelectable);
        });

        it('should emit the new selection when the store changes', async () => {
            const gate = new AndGate({ x: 0, y: 0 }, 2);
            const selection: SelectedSelectable = { selectable: gate, concreteClassName: AndGate.name };
            store.overrideSelector(selectSelectedSelectable, selection);
            store.refreshState();

            expect(await firstValueFrom(component['selectedSelectable$'])).toBe(selection);
        });

        it('should pass the selection to the presenter', async () => {
            const gate = new AndGate({ x: 0, y: 0 }, 2);
            const selection: SelectedSelectable = { selectable: gate, concreteClassName: AndGate.name };
            store.overrideSelector(selectSelectedSelectable, selection);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(By.directive(MockDiagramWorkspacePresenterComponent))
                .componentInstance as MockDiagramWorkspacePresenterComponent;
            expect(presenter.selectedSelectable).toBe(selection);
        });
    });

    describe('selectionCleared', () => {
        it('should clear the whole selection and go back to select mode when the presenter reports Esc', () => {
            const dispatch = vi.spyOn(store, 'dispatch');
            const presenter = fixture.debugElement.query(By.directive(MockDiagramWorkspacePresenterComponent))
                .componentInstance as MockDiagramWorkspacePresenterComponent;

            presenter.selectionCleared.emit();

            expect(dispatch).toHaveBeenCalledWith(componentActions.clearSelection());
            expect(dispatch).toHaveBeenCalledWith(workspaceActions.updateMouseMode({ mode: 'select' }));
        });
    });

    describe('componentPlaced', () => {
        const presenterOf = () => fixture.debugElement.query(By.directive(MockDiagramWorkspacePresenterComponent))
            .componentInstance as MockDiagramWorkspacePresenterComponent;

        const selectActions = (dispatch: ReturnType<typeof vi.spyOn>) =>
            dispatch.mock.calls
                .map(([a]) => a as unknown as ReturnType<typeof componentActions.selectPaletteComponent>)
                .filter(a => a.type === componentActions.selectPaletteComponent.type);

        it('should select a fresh ghost of the same palette component so it can be placed again', () => {
            const paletteComponent = { className: AndGate.name, selected: true };
            store.overrideSelector(selectSelectedPaletteComponent, paletteComponent);
            store.refreshState();
            const dispatch = vi.spyOn(store, 'dispatch');

            presenterOf().componentPlaced.emit();

            const [action] = selectActions(dispatch);
            expect(action.paletteComponent).toBe(paletteComponent);
            expect(action.concreteClassName).toBe(AndGate.name);
            expect(action.selectable).toBeInstanceOf(AndGate);
            expect((action.selectable as unknown as { isGhost: boolean }).isGhost).toBe(true);
        });

        it('should create a new instance for every placement', () => {
            store.overrideSelector(selectSelectedPaletteComponent, { className: AndGate.name, selected: true });
            store.refreshState();
            const dispatch = vi.spyOn(store, 'dispatch');

            presenterOf().componentPlaced.emit();
            presenterOf().componentPlaced.emit();

            const actions = selectActions(dispatch);
            expect(actions).toHaveLength(2);
            expect(actions[0].selectable).not.toBe(actions[1].selectable);
        });

        it('should keep the mouse in place mode and not clear the palette selection', () => {
            store.overrideSelector(selectSelectedPaletteComponent, { className: AndGate.name, selected: true });
            store.refreshState();
            const dispatch = vi.spyOn(store, 'dispatch');

            presenterOf().componentPlaced.emit();

            expect(dispatch).not.toHaveBeenCalledWith(workspaceActions.updateMouseMode({ mode: 'select' }));
            expect(dispatch).not.toHaveBeenCalledWith(componentActions.clearSelection());
            expect(dispatch).not.toHaveBeenCalledWith(componentActions.clearSelectedPaletteComponent());
        });

        it('should go back to select mode when no palette component is selected anymore', () => {
            store.overrideSelector(selectSelectedPaletteComponent, null);
            store.refreshState();
            const dispatch = vi.spyOn(store, 'dispatch');

            presenterOf().componentPlaced.emit();

            expect(selectActions(dispatch)).toHaveLength(0);
            expect(dispatch).toHaveBeenCalledWith(workspaceActions.updateMouseMode({ mode: 'select' }));
        });
    });
});