import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, Subject } from 'rxjs';

import { DiagramWorkspaceContainerComponent } from './diagram-workspace.container.component';
import { DiagramWorkspacePresenterComponent } from '../presenter/diagram-workspace.presenter.component';
import { DiagramController } from '../controller/diagram.controller';
import type { DiagramView } from '../controller/diagram-view';
import { selectWorkspaceSettings } from '../../../../store/settings/feature';
import { selectDiagramWorkspaceState } from '../../../../store/workspace/feature';
import { selectSelectedPaletteComponent, selectSelectedSelectable } from '../../../../store/components/feature';
import * as componentActions from '../../../../store/components/actions';
import * as workspaceActions from '../../../../store/workspace/actions';
import type { SelectedSelectable } from '../../../../store/components/state';
import type { PaletteComponent } from '../../../../models/components/PaletteComponent';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { CodeWorkspaceState, DiagramWorkspaceState } from '../../../../store/workspace/state';
import { ComponentType } from '../../../../models/components/Component';

@Component({
    selector: 'app-diagram-workspace-presenter',
    template: '',
})
class MockDiagramWorkspacePresenterComponent {
    @Input({ required: true }) id!: string;
    @Input({ required: true }) workspaceSettings!: WorkspaceSettingsState | null;
    @Input({ required: true }) workspaceState!: DiagramWorkspaceState | CodeWorkspaceState | null;
    @Output() viewReady = new EventEmitter<DiagramView>();
}

/** Stands in for the controller, so it is only this container's part that is tested here. */
class MockDiagramController {
    attach = vi.fn();
    setPaletteComponent = vi.fn();
    setSelectedSelectable = vi.fn();
    setWorkspaceSettings = vi.fn();
    selectionCleared$ = new Subject<void>();
}

const mockSettings: WorkspaceSettingsState = {} as unknown as WorkspaceSettingsState;

const mockWorkspaceState: DiagramWorkspaceState = {
    mouseMode: 'select',
    mousePosition: { x: 0, y: 0 },
};

const mockSelectedSelectable: SelectedSelectable | null = null;

describe('DiagramWorkspaceContainerComponent', () => {
    let component: DiagramWorkspaceContainerComponent;
    let fixture: ComponentFixture<DiagramWorkspaceContainerComponent>;
    let store: MockStore;
    let controller: MockDiagramController;

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
                remove: { imports: [DiagramWorkspacePresenterComponent], providers: [DiagramController] },
                add: { imports: [MockDiagramWorkspacePresenterComponent], providers: [{ provide: DiagramController, useClass: MockDiagramController }] },
            })
            .compileComponents();

        store = TestBed.inject(MockStore);
        fixture = TestBed.createComponent(DiagramWorkspaceContainerComponent);
        component = fixture.componentInstance;
        component.id = 'test-diagram-id';
        controller = fixture.debugElement.injector.get(DiagramController) as unknown as MockDiagramController;
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

    describe('controller', () => {
        const paletteComponent: PaletteComponent = { type: ComponentType.AndGate, selected: true };
        const selection: SelectedSelectable = { workspaceId: 'test-diagram-id', id: 'gate-1', type: ComponentType.AndGate };
        const presenterOf = () => fixture.debugElement.query(By.directive(MockDiagramWorkspacePresenterComponent))
            .componentInstance as MockDiagramWorkspacePresenterComponent;

        it('should be provided by the container, so each workspace has its own', () => {
            expect(controller).toBeInstanceOf(MockDiagramController);
        });

        it('should attach the controller to the presenter once its view is ready, with the workspace id', () => {
            const view = {} as DiagramView;

            presenterOf().viewReady.emit(view);

            expect(controller.attach).toHaveBeenCalledOnce();
            expect(controller.attach).toHaveBeenCalledWith(view, 'test-diagram-id');
        });

        it('should not attach before the view is ready', () => {
            expect(controller.attach).not.toHaveBeenCalled();
        });

        it('should tell the controller what the store holds from the start', () => {
            expect(controller.setPaletteComponent).toHaveBeenCalledWith(null);
            expect(controller.setSelectedSelectable).toHaveBeenCalledWith(null);
            expect(controller.setWorkspaceSettings).toHaveBeenCalledWith(mockSettings);
        });

        it('should tell the controller when the palette selection changes', () => {
            store.overrideSelector(selectSelectedPaletteComponent, paletteComponent);
            store.refreshState();
            expect(controller.setPaletteComponent).toHaveBeenLastCalledWith(paletteComponent);

            store.overrideSelector(selectSelectedPaletteComponent, null);
            store.refreshState();
            expect(controller.setPaletteComponent).toHaveBeenLastCalledWith(null);
        });

        it('should tell the controller when the selected component changes', () => {
            store.overrideSelector(selectSelectedSelectable, selection);
            store.refreshState();

            expect(controller.setSelectedSelectable).toHaveBeenLastCalledWith(selection);
        });

        it('should tell the controller when the workspace settings change, but not when they are null', () => {
            const updated: WorkspaceSettingsState = { gridSettings: { gridSpacing: 10, gridMode: 'lines' } };
            store.overrideSelector(selectWorkspaceSettings, updated);
            store.refreshState();
            expect(controller.setWorkspaceSettings).toHaveBeenLastCalledWith(updated);

            controller.setWorkspaceSettings.mockClear();
            store.overrideSelector(selectWorkspaceSettings, null as unknown as WorkspaceSettingsState);
            store.refreshState();
            expect(controller.setWorkspaceSettings).not.toHaveBeenCalled();
        });

        it('should not pass the selection to the presenter, which only shows the diagram', () => {
            const presenter = presenterOf() as unknown as Record<string, unknown>;
            expect('selectedPaletteComponent' in presenter).toBe(false);
            expect('selectedSelectable' in presenter).toBe(false);
        });

        it('should stop listening to the store once destroyed', () => {
            fixture.destroy();
            controller.setPaletteComponent.mockClear();

            store.overrideSelector(selectSelectedPaletteComponent, paletteComponent);
            store.refreshState();

            expect(controller.setPaletteComponent).not.toHaveBeenCalled();
        });
    });

    describe('selectionCleared', () => {
        it('should clear the whole selection and go back to select mode when the controller reports Esc', () => {
            const dispatch = vi.spyOn(store, 'dispatch');

            controller.selectionCleared$.next();

            expect(dispatch).toHaveBeenCalledWith(componentActions.clearSelection());
            expect(dispatch).toHaveBeenCalledWith(workspaceActions.updateMouseMode({ mode: 'select' }));
        });

        it('should stop reacting once destroyed', () => {
            fixture.destroy();
            const dispatch = vi.spyOn(store, 'dispatch');

            controller.selectionCleared$.next();

            expect(dispatch).not.toHaveBeenCalled();
        });
    });
});
