import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputNumberModule } from 'primeng/inputnumber';
import { SettingsPresenterComponent } from "../presenter/settings.presenter.component";
import { Store } from '@ngrx/store';
import { SettingsState } from '../../../store/settings/state';
import { initialSettingsState, settingsFeature } from '../../../store/settings/feature';
import * as actions from '../../../store/settings/actions';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings-container',
  imports: [
    CommonModule,
    InputNumberModule,
    SettingsPresenterComponent
],
  template: `
    <app-settings-presenter
      [(settings)]="settingsStateCopy"
      (applyChanges)="applyChanges()"
    ></app-settings-presenter>
`
})
export class SettingsContainerComponent implements OnDestroy {
  protected settingsStateCopy!: SettingsState;
  protected settingsSubscription: Subscription;

  constructor(private store: Store<SettingsState>) {
    this.settingsSubscription = this.store.select(settingsFeature.selectSettingsFeatureState).subscribe({
      next: (state: SettingsState) => {
        this.settingsStateCopy = Object.assign({}, state); // clone state to copy
      },
      error: () => {
        this.settingsStateCopy = Object.assign({}, initialSettingsState); // clone initialstate to copy
      }
    });
  }

  applyChanges(): void {
    this.store.dispatch(actions.updateSettings({ settings: this.settingsStateCopy }));
  }

  ngOnDestroy(): void {
    this.settingsSubscription.unsubscribe();
  }
}
