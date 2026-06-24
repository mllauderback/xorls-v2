import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { SplitterModule } from 'primeng/splitter';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import type { PaletteComponent } from '../../../models/components/PaletteComponent';
import type { PaletteComponentCategories } from '../../../store/components/state';
import { GridSelectionPanelComponent } from '../../grid-selection-panel/grid-selection-panel.component';

@Component({
    selector: 'app-component-palette-presenter',
    imports: [
    AccordionModule,
    SplitterModule,
    PanelModule,
    ButtonModule,
    CommonModule,
    GridSelectionPanelComponent,
],
    templateUrl: './component-palette.presenter.component.html',
    styleUrl: './component-palette.presenter.component.scss'
})
export class ComponentPalettePresenterComponent {
    @Input() categoryPaletteComponentMap?: Map<PaletteComponentCategories, PaletteComponent[]>;
    @Output() categoryPaletteComponentMapChange = new EventEmitter<Map<PaletteComponentCategories, PaletteComponent[]>>();

    protected onMapChange(map: Map<PaletteComponentCategories, PaletteComponent[]>) {
        this.categoryPaletteComponentMap = map;
        this.categoryPaletteComponentMapChange.emit(map);
    }
}
