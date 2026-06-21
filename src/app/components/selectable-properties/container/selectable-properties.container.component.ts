import { Component, inject } from '@angular/core';
import { SelectablePropertiesPresenterComponent } from "../presenter/selectable-properties.presenter.component";
import { Store } from '@ngrx/store';
import type { PaletteComponentsState, SelectedSelectable } from '../../../store/components/state';
import type { Observable } from 'rxjs';
import { componentsFeature } from '../../../store/components/feature';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-selectable-properties-container',
  imports: [
    SelectablePropertiesPresenterComponent,
    CommonModule
  ],
  template: `
    <app-selectable-properties-presenter
      [selectable]="selectable$ | async"
    ></app-selectable-properties-presenter>
  `,
})
export class SelectablePropertiesContainerComponent {
  private store = inject<Store<PaletteComponentsState>>(Store);

  protected selectable$!: Observable<SelectedSelectable>;

  constructor() {
    this.selectable$ = this.store.select(componentsFeature.selectSelectedSelectable);
  }
}
