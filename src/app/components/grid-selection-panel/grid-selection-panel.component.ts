import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import type { PaletteComponent } from '../../models/components/PaletteComponent';
import type { PaletteComponentCategories, PaletteComponentRecord } from '../../store/components/state';
import { mapComponents } from '../../store/components/reducer-functions';
import { PaletteComponentSvgsComponent } from '../responsive-svgs/palette-component-svgs/palette-component-svgs.component';

@Component({
    selector: 'app-grid-selection-panel',
    imports: [
        PaletteComponentSvgsComponent,
        TooltipModule
    ],
    templateUrl: './grid-selection-panel.component.html',
    styleUrl: './grid-selection-panel.component.scss'
})
export class GridSelectionPanelComponent {
    @Input({ required: true }) categoryPaletteComponents?: PaletteComponentRecord;
    @Input({ required: true }) category?: PaletteComponentCategories;
    @Output() categoryPaletteComponentsChange = new EventEmitter<PaletteComponentRecord>();

    select($event: MouseEvent, paletteComponent: PaletteComponent): void {

        $event.preventDefault();
        if (!this.categoryPaletteComponents || !this.category) return;
        const targetButton = $event.target as HTMLInputElement;
        // a copy with nothing selected: the palette selects one component at a time
        const recordCopy = mapComponents(this.categoryPaletteComponents, c => ({ ...c, selected: false }));
        if (paletteComponent.selected) {
            targetButton.checked = false;
        }
        else {
            recordCopy[this.category]?.forEach((pc: PaletteComponent) => {
                if (pc.type === paletteComponent.type) {
                    pc.selected = true;
                }
            });
        }
        this.categoryPaletteComponentsChange.emit(recordCopy);
    }

}