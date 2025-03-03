import { Component, Input } from '@angular/core';
import { GridSelectionPanelPresenterComponent } from "../presenter/grid-selection-panel.presenter.component";
import { PaletteComponent } from '../../models/components/PaletteComponent';
import { PaletteComponentList, PaletteComponentsState } from '../../store/components/components.state';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import * as actions from '../../store/components/components.actions';

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
  @Input() paletteComponentMap?: Map<string, PaletteComponent[]>
  @Input() category: string = "";
  
  constructor(private store: Store<PaletteComponentsState>) {

  }

  updateCategoryPaletteComponentMap(map: Map<string, PaletteComponent[]>) {
    let paletteComponentList: PaletteComponentList = {
      "Gates": map.get("Gates")!,
      "I/O": map.get("I/O")!,
      "Decorations": map.get("Decorations")!
    };
    this.store.dispatch(actions.setPaletteComponentList({ paletteComponentList }));
  }
}
