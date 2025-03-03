import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PaletteComponent } from '../../models/components/PaletteComponent';
import { cloneDeep } from 'lodash';

@Component({
  selector: 'app-grid-selection-presenter-panel',
  imports: [],
  templateUrl: './grid-selection-panel.presenter.component.html',
  styleUrl: './grid-selection-panel.presenter.component.scss'
})
export class GridSelectionPanelPresenterComponent {
  @Input({ required: true }) categoryPaletteComponentMap?: Map<string, PaletteComponent[]>;
  @Input({ required: true }) category: string = "";
  @Output() categoryPaletteComponentMapChange = new EventEmitter<Map<string, PaletteComponent[]>>();

  select($event: MouseEvent, paletteComponent: PaletteComponent): void {
    $event.preventDefault();
    if (!this.categoryPaletteComponentMap) return;
    let targetButton = $event.target as HTMLInputElement;
    let mapCopy = cloneDeep(this.categoryPaletteComponentMap);

    if (paletteComponent.selected) {
      targetButton.checked = false;
      mapCopy = this.clearPaletteSelection(mapCopy);
    }
    else {
      mapCopy = this.clearPaletteSelection(mapCopy);
      mapCopy.get(this.category)?.forEach((mapPaletteComponent: PaletteComponent, index: number) => {
        if (mapPaletteComponent.className == paletteComponent.className) {
          mapPaletteComponent.selected = true;
        }
      });
    }
    this.categoryPaletteComponentMapChange.emit(mapCopy);
  }

  clearPaletteSelection(mapCopy: Map<string, PaletteComponent[]>): Map<string, PaletteComponent[]> {
    for (let [_category, paletteComponents] of mapCopy) {
      for (let paletteComponent of paletteComponents) {
        paletteComponent.selected = false;
      }
    }
    return mapCopy;
  }
}