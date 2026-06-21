import { Component, Input, inject } from '@angular/core';
import { GridSelectionPanelPresenterComponent } from "../presenter/grid-selection-panel.presenter.component";
import type { PaletteComponent } from '../../../models/components/PaletteComponent';
import type { PaletteComponentCategories, PaletteComponentsState } from '../../../store/components/components.state';
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
  private store = inject<Store<PaletteComponentsState>>(Store);

  @Input() paletteComponentMap?: Map<PaletteComponentCategories, PaletteComponent[]>
  @Input() category?: PaletteComponentCategories;

  updateCategoryPaletteComponentMap(map: Map<PaletteComponentCategories, PaletteComponent[]>) {
    this.store.dispatch(actions.setPaletteComponentMap({ paletteComponentMap: map }));
  }
}
