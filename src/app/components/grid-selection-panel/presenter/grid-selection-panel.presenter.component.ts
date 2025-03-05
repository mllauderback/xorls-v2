import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { PaletteComponent } from '../../../models/components/PaletteComponent';
import { cloneDeep } from 'lodash';
import { PaletteComponentCategories } from '../../../store/components/components.state';
import { PaletteComponentSvgsComponent } from '../../responsive-svgs/palette-component-svgs/palette-component-svgs.component';

@Component({
  selector: 'app-grid-selection-presenter-panel',
  imports: [
    PaletteComponentSvgsComponent,
    TooltipModule
  ],
  templateUrl: './grid-selection-panel.presenter.component.html',
  styleUrl: './grid-selection-panel.presenter.component.scss'
})
export class GridSelectionPanelPresenterComponent {
  @Input({ required: true }) categoryPaletteComponentMap?: Map<PaletteComponentCategories, PaletteComponent[]>;
  @Input({ required: true }) category?: PaletteComponentCategories;
  @Output() categoryPaletteComponentMapChange = new EventEmitter<Map<PaletteComponentCategories, PaletteComponent[]>>();

  select($event: MouseEvent, paletteComponent: PaletteComponent): void {

    $event.preventDefault();
    if (!this.categoryPaletteComponentMap || !this.category) return;
    let targetButton = $event.target as HTMLInputElement;
    let mapCopy = cloneDeep(this.categoryPaletteComponentMap);

    if (paletteComponent.selected) {
      targetButton.checked = false;
      this.clearPaletteSelection(mapCopy);
    }
    else {
      this.clearPaletteSelection(mapCopy);
      mapCopy.get(this.category)?.forEach((mapPaletteComponent: PaletteComponent, index: number) => {
        if (mapPaletteComponent.className == paletteComponent.className) {
          mapPaletteComponent.selected = true;
        }
      });
    }
    this.categoryPaletteComponentMapChange.emit(mapCopy);
  }

  private clearPaletteSelection(mapCopy: Map<PaletteComponentCategories, PaletteComponent[]>): void {
    for (let [_category, paletteComponents] of mapCopy) {
      for (let paletteComponent of paletteComponents) {
        paletteComponent.selected = false;
      }
    }
  }
}