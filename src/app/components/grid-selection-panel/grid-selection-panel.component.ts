import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import type { PaletteComponent } from '../../models/components/PaletteComponent';
import type { PaletteComponentCategories } from '../../store/components/state';
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
    @Input({ required: true }) categoryPaletteComponentMap?: Map<PaletteComponentCategories, PaletteComponent[]>;
    @Input({ required: true }) category?: PaletteComponentCategories;
    @Output() categoryPaletteComponentMapChange = new EventEmitter<Map<PaletteComponentCategories, PaletteComponent[]>>();

    select($event: MouseEvent, paletteComponent: PaletteComponent): void {

        $event.preventDefault();
        if (!this.categoryPaletteComponentMap || !this.category) return;
        const targetButton = $event.target as HTMLInputElement;
        const mapCopy = this.cloneCategoryPaletteComponentMap(this.categoryPaletteComponentMap);
        if (paletteComponent.selected) {
            targetButton.checked = false;
            this.clearPaletteSelection(mapCopy);
        }
        else {
            this.clearPaletteSelection(mapCopy);
            mapCopy.get(this.category)?.forEach((mapPaletteComponent: PaletteComponent, _index: number) => {
                if (mapPaletteComponent.className === paletteComponent.className) {
                    mapPaletteComponent.selected = true;
                }
            });
        }
        this.categoryPaletteComponentMapChange.emit(mapCopy);
    }

    private cloneCategoryPaletteComponentMap(map: Map<PaletteComponentCategories, PaletteComponent[]>) {
        return new Map(
            [...map.entries()].map(([category, components]) => [
                category,
                components.map(c => ({ ...c }))
            ])
        );
    }

    private clearPaletteSelection(mapCopy: Map<PaletteComponentCategories, PaletteComponent[]>): void {
        for (const [_category, paletteComponents] of mapCopy) {
            for (const paletteComponent of paletteComponents) {
                paletteComponent.selected = false;
            }
        }
    }
}