import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsPresenterComponent } from "../presenter/settings.presenter.component";
import { Store } from '@ngrx/store';
import type { SettingsState } from '../../../store/settings/state';
import { selectSettingsFeatureState } from '../../../store/settings/feature';
import * as actions from '../../../store/settings/actions';
import { type Observable } from 'rxjs';
import { type GridMode } from '../../canvas-layers/grid-canvas-layer/Grid';

// TODO: have single output for each settings category (GridSettings, ZoomSettings, etc)
@Component({
    selector: 'app-settings-container',
    imports: [
        CommonModule,
        SettingsPresenterComponent
    ],
    template: `
    <app-settings-presenter
        [settings]="settingsState$ | async"
        (gridMode)="updateGridMode($event)"
        (gridSpacing)="updateGridSpacing($event)"
        (zoomScrollRate)="updateZoomScrollRate($event)"
        (zoomPinchRate)="updateZoomPinchRate($event)"
        (minZoom)="updateMinZoom($event)"
        (maxZoom)="updateMaxZoom($event)"
        (invertScroll)="updateZoomScrollInversion($event)"
    ></app-settings-presenter>
`
})
export class SettingsContainerComponent {
    private store = inject<Store<SettingsState>>(Store);

    protected settingsState$: Observable<SettingsState>;

    constructor() {
        this.settingsState$ = this.store.select(selectSettingsFeatureState);
    }

    protected updateGridMode(mode: GridMode) {
        this.store.dispatch(actions.updateGridMode({ mode }));
    }

    protected updateGridSpacing(spacing: number) {
        this.store.dispatch(actions.updateGridSpacing({ spacing }));
    }

    protected updateZoomScrollRate(scrollRate: number) {
        this.store.dispatch(actions.updateZoomScrollRate({ scrollRate }));
    }

    protected updateZoomPinchRate(pinchRate: number) {
        this.store.dispatch(actions.updateZoomPinchRate({ pinchRate }));
    }

    protected updateMinZoom(minZoom: number) {
        this.store.dispatch(actions.updateMinZoom({ minZoom }));
    }

    protected updateMaxZoom(maxZoom: number) {
        this.store.dispatch(actions.updateMaxZoom({ maxZoom }));
    }

    protected updateZoomScrollInversion(invertScroll: boolean) {
        this.store.dispatch(actions.setZoomScrollInversion({ invertScroll }));
    }
}
