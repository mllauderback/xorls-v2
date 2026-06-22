import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputNumberModule } from 'primeng/inputnumber';
import { SettingsPresenterComponent } from "../presenter/settings.presenter.component";
import { Store } from '@ngrx/store';
import type { SettingsState } from '../../../store/settings/state';
import { selectSettingsFeatureState } from '../../../store/settings/feature';
import * as actions from '../../../store/settings/actions';
import { type Observable } from 'rxjs';
import { type GridMode } from '../../../models/Grid';

@Component({
    selector: 'app-settings-container',
    imports: [
        CommonModule,
        InputNumberModule,
        SettingsPresenterComponent
    ],
    template: `
    <app-settings-presenter
        [settings]="settingsState$ | async"
        (gridMode)="updateGridMode($event)"
        (gridSpacing)="updateGridSpacing($event)"
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
}
