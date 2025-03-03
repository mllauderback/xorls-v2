import { Component, Input } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { SplitterModule } from 'primeng/splitter';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { GridSelectionPanelComponent } from '../../grid-selection-panel/container/grid-selection-panel.container.component';
import { PaletteComponent } from '../../models/components/PaletteComponent';
import { PaletteComponentCategories } from '../../store/components/components.state';

@Component({
  selector: 'app-component-palette-presenter',
  imports: [
    AccordionModule,
    SplitterModule,
    ScrollPanelModule,
    PanelModule,
    ButtonModule,
    CommonModule,
    GridSelectionPanelComponent
],
  templateUrl: './component-palette.presenter.component.html',
  styleUrl: './component-palette.presenter.component.scss'
})
export class ComponentPalettePresenterComponent {
  @Input() categoryPaletteComponentMap?: Map<PaletteComponentCategories, PaletteComponent[]>;
}
