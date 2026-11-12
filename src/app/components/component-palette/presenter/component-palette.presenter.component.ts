import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { SplitterModule } from 'primeng/splitter';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import type { PaletteComponentCategories, PaletteComponentRecord } from '../../../store/components/state';
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
    @Input() categoryPaletteComponents?: PaletteComponentRecord;
    @Output() categoryPaletteComponentsChange = new EventEmitter<PaletteComponentRecord>();

    /** The categories to show, in the order they are in the record. */
    protected get categories(): PaletteComponentCategories[] {
        return Object.keys(this.categoryPaletteComponents ?? {}) as PaletteComponentCategories[];
    }

    protected onRecordChange(record: PaletteComponentRecord) {
        this.categoryPaletteComponents = record;
        this.categoryPaletteComponentsChange.emit(record);
    }
}
