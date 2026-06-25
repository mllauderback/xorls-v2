import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import type { MemoizedSelector } from '@ngrx/store';
import { SettingsContainerComponent } from './settings.container.component';
import { selectSettingsFeatureState } from '../../../store/settings/feature';
import * as actions from '../../../store/settings/actions';
import type { SettingsState } from '../../../store/settings/state';
import type { GridMode } from '../../canvas-layers/grid-canvas-layer/Grid';
import { SettingsPresenterComponent } from '../presenter/settings.presenter.component';

@Component({ selector: 'app-settings-presenter', template: '<div></div>' })
class MockSettingsPresenterComponent {
    @Input({ required: true }) settings?: SettingsState | null;
    @Output() gridMode = new EventEmitter<GridMode>();
    @Output() gridSpacing = new EventEmitter<number>();
}

const mockSettingsState: SettingsState = {
    leftPanelResizeByPct: true,
    leftPanelWidth: 30,
    workspaceSettings: {
        gridSettings: {
            gridSpacing: 20,
            gridMode: 'dots'
        }
    }
};

describe('SettingsContainerComponent', () => {
    let fixture: ComponentFixture<SettingsContainerComponent>;
    let component: SettingsContainerComponent;
    let store: MockStore;
    let mockSelectSettingsFeatureState: MemoizedSelector<SettingsState, SettingsState>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SettingsContainerComponent],
            providers: [provideMockStore()],
        })
            .overrideComponent(SettingsContainerComponent, {
                remove: { imports: [SettingsPresenterComponent] },
                add: { imports: [MockSettingsPresenterComponent] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(SettingsContainerComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        mockSelectSettingsFeatureState = store.overrideSelector(selectSettingsFeatureState, mockSettingsState);
        fixture.detectChanges();

        vi.spyOn(store, 'dispatch');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('store selection', () => {
        it('should select settingsState$ from the store', () => {
            let emittedValue: SettingsState | undefined;
            component['settingsState$'].subscribe((val) => {
                emittedValue = val;
            });

            expect(emittedValue).toEqual(mockSettingsState);
        });

        it('should pass settings to the presenter via async pipe', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockSettingsPresenterComponent)
            ).componentInstance as MockSettingsPresenterComponent;

            expect(presenter.settings).toEqual(mockSettingsState);
        });

        it('should update the presenter when the store emits a new value', async () => {
            await fixture.whenStable();

            const updatedSettings: SettingsState = {
                leftPanelResizeByPct: true,
                leftPanelWidth: 20,
                workspaceSettings: {
                    gridSettings: {
                        gridSpacing: 20,
                        gridMode: 'lines'
                    }
                }
            };
            mockSelectSettingsFeatureState.setResult(updatedSettings);
            store.refreshState();
            fixture.detectChanges();
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockSettingsPresenterComponent)
            ).componentInstance as MockSettingsPresenterComponent;

            expect(presenter.settings).toEqual(updatedSettings);
        });
    });

    describe('updateGridMode', () => {
        it('should dispatch updateGridMode action with the emitted mode', async () => {
            await fixture.whenStable();

            const mode: GridMode = 'dots'; 
            const presenter = fixture.debugElement.query(
                By.directive(MockSettingsPresenterComponent)
            ).componentInstance as MockSettingsPresenterComponent;

            presenter.gridMode.emit(mode);

            expect(store.dispatch).toHaveBeenCalledWith(actions.updateGridMode({ mode }));
        });

        it('should dispatch updateGridMode exactly once per emission', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockSettingsPresenterComponent)
            ).componentInstance as MockSettingsPresenterComponent;

            presenter.gridMode.emit('dots');
            presenter.gridMode.emit('lines');

            expect(store.dispatch).toHaveBeenCalledTimes(2);
        });
    });

    describe('updateGridSpacing', () => {
        it('should dispatch updateGridSpacing action with the emitted spacing', async () => {
            await fixture.whenStable();

            const spacing = 20;
            const presenter = fixture.debugElement.query(
                By.directive(MockSettingsPresenterComponent)
            ).componentInstance as MockSettingsPresenterComponent;

            presenter.gridSpacing.emit(spacing);

            expect(store.dispatch).toHaveBeenCalledWith(actions.updateGridSpacing({ spacing }));
        });

        it('should dispatch updateGridSpacing exactly once per emission', async () => {
            await fixture.whenStable();

            const presenter = fixture.debugElement.query(
                By.directive(MockSettingsPresenterComponent)
            ).componentInstance as MockSettingsPresenterComponent;

            presenter.gridSpacing.emit(10);
            presenter.gridSpacing.emit(20);

            expect(store.dispatch).toHaveBeenCalledTimes(2);
        });
    });
});