import { Component, Input } from '@angular/core';
import { GridSelectionPanelPresenterComponent } from "../presenter/grid-selection-panel.presenter.component";
import { PaletteComponent } from '../../../models/components/PaletteComponent';
import { PaletteComponentCategories, PaletteComponentList, PaletteComponentsState } from '../../../store/components/components.state';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import * as actions from '../../../store/components/components.actions';

@Component({
  selector: 'app-grid-selection-container-panel',
  imports: [
    GridSelectionPanelPresenterComponent,
    CommonModule
  ],
  template: `
    <app-grid-selection-presenter-panel
      [categoryPaletteComponentMap]="paletteComponentMap"
      (categoryPaletteComponentMapChange)="updateCategoryPaletteComponentMap($event)"
      [category]="category"
    ></app-grid-selection-presenter-panel>
  `
})
export class GridSelectionPanelComponent {
  @Input() paletteComponentMap?: Map<PaletteComponentCategories, PaletteComponent[]>
  @Input() category?: PaletteComponentCategories;
  
  constructor(private store: Store<PaletteComponentsState>) {}

  updateCategoryPaletteComponentMap(map: Map<PaletteComponentCategories, PaletteComponent[]>) {
    this.store.dispatch(actions.setPaletteComponentMap({ paletteComponentMap: map }));
  }
}
