import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import type { MemoizedSelector } from '@ngrx/store';
import { SettingsContainerComponent } from './settings.container.component';
import { DEFAULT_ZOOM_SETTINGS, selectSettingsFeatureState } from '../../../store/settings/feature';
import * as actions from '../../../store/settings/actions';
import type { SettingsState } from '../../../store/settings/state';
import type { GridMode } from '../../canvas-layers/grid-canvas-layer/Grid';
import { SettingsPresenterComponent } from '../presenter/settings.presenter.component';

@Component({ selector: 'app-settings-presenter', template: '<div></div>' })
class MockSettingsPresenterComponent {
    @Input({ required: true }) settings?: SettingsState | null;
    @Output() gridMode = new EventEmitter<GridMode>();
    @Output() gridSpacing = new EventEmitter<number>();
    @Output() zoomScrollRate = new EventEmitter<number>();
    @Output() zoomPinchRate = new EventEmitter<number>();
    @Output() minZoom = new EventEmitter<number>();
    @Output() maxZoom = new EventEmitter<number>();
    @Output() invertScroll = new EventEmitter<boolean>();
}

const mockSettingsState: SettingsState = {
    leftPanelResizeByPct: true,
    leftPanelWidth: 30,
    workspaceSettings: {
        gridSettings: {
            gridSpacing: 20,
            gridMode: 'dots'
        },
        zoomSettings: { ...DEFAULT_ZOOM_SETTINGS }
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
                    },
                    zoomSettings: { ...DEFAULT_ZOOM_SETTINGS, scrollRate: 0.003 }
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

    describe('update zoom settings', () => {
        let presenter: MockSettingsPresenterComponent;
        beforeEach(async () => {
            await fixture.whenStable();
            presenter = fixture.debugElement.query(
                By.directive(MockSettingsPresenterComponent)
            ).componentInstance as MockSettingsPresenterComponent;
        });
        it('should dispatch updateZoomScrollRate with a new scroll rate', () => {
            const scrollRate = 0.004;
            presenter.zoomScrollRate.emit(scrollRate);

            expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(actions.updateZoomScrollRate({ scrollRate }));
        });

        it('should dispatch updateZoomPinchRate with a new pinch rate', () => {
            const pinchRate = 0.03;
            presenter.zoomPinchRate.emit(pinchRate);

            expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(actions.updateZoomPinchRate({ pinchRate }));
        });

        it('should dispatch updateMinZoom with new min zoom factor', () => {
            const minZoom = 0.125;
            presenter.minZoom.emit(minZoom);

            expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(actions.updateMinZoom({ minZoom }));
        });

        it('should dispatch updateMaxZoom with new max zoom factor', () => {
            const maxZoom = 7;
            presenter.maxZoom.emit(maxZoom);

            expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(actions.updateMaxZoom({ maxZoom }));
        });

        it('should dispatch setZoomScrollInversion', () => {
            const invertScroll = true;
            presenter.invertScroll.emit(invertScroll);

            expect(store.dispatch).toHaveBeenCalledExactlyOnceWith(actions.setZoomScrollInversion({ invertScroll }));
        });
    });
});