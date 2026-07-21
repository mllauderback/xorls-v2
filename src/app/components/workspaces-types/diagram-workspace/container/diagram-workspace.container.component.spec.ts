import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { By } from '@angular/platform-browser';
import { Component, Input } from '@angular/core';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom } from 'rxjs';

import { DiagramWorkspaceContainerComponent } from './diagram-workspace.container.component';
import { DiagramWorkspacePresenterComponent } from '../presenter/diagram-workspace.presenter.component';
import { selectWorkspaceSettings } from '../../../../store/settings/feature';
import { selectDiagramWorkspaceState } from '../../../../store/workspace/feature';
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
}

const mockSettings: WorkspaceSettingsState = {} as unknown as WorkspaceSettingsState;

const mockWorkspaceState: DiagramWorkspaceState = {
    mouseMode: 'select',
    mousePosition: { x: 0, y: 0 },
};

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
});