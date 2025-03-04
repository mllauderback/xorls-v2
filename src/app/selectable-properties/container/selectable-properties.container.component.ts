import { Component, Input } from '@angular/core';
import { SelectablePropertiesPresenterComponent } from "../presenter/selectable-properties.presenter.component";
import { Selectable } from '../../models/Selectable';
import { Store } from '@ngrx/store';
import { PaletteComponentsState, SelectedSelectable } from '../../store/components/components.state';
import { Observable } from 'rxjs';
import { componentsFeature } from '../../store/components/components.feature';
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
  protected selectable$!: Observable<SelectedSelectable>;

  constructor(private store: Store<PaletteComponentsState>) {
    this.selectable$ = this.store.select(componentsFeature.selectSelectedSelectable);
  }
}
