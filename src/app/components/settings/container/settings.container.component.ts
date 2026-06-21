import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputNumberModule } from 'primeng/inputnumber';
import { SettingsPresenterComponent } from "../presenter/settings.presenter.component";
import { Store } from '@ngrx/store';
import { SettingsState } from '../../../store/settings/state';
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
    @if (settingsState$ | async; as settings) {
    <app-settings-presenter
        [settings]="settings"
        (gridMode)="updateGridMode($event)"
        (gridSpacing)="updateGridSpacing($event)"
    ></app-settings-presenter>
    } @else {
        <p>Loading Settings...</p>
    }
`
})
export class SettingsContainerComponent implements OnDestroy {
    protected settingsState$: Observable<SettingsState>;

    constructor(private store: Store<SettingsState>) {
        this.settingsState$ = this.store.select(selectSettingsFeatureState);
    }

    protected updateGridMode(mode: GridMode) {
        this.store.dispatch(actions.updateGridMode({ mode }));
    }

    protected updateGridSpacing(spacing: number) {
        this.store.dispatch(actions.updateGridSpacing({ spacing }));
    }

    ngOnDestroy(): void {
    }
}
