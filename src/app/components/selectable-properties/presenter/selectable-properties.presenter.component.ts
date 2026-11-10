import { Component, Input } from '@angular/core';
import { DividerModule } from 'primeng/divider';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import type { SelectedSelectable } from '../../../store/components/state';

@Component({
  selector: 'app-selectable-properties-presenter',
  imports: [
    DividerModule,
    ScrollPanelModule
  ],
  templateUrl: './selectable-properties.presenter.component.html',
  styleUrl: './selectable-properties.presenter.component.scss'
})
export class SelectablePropertiesPresenterComponent {
  @Input() selectable!: SelectedSelectable | null; // null when nothing is selected, and before the async pipe emits
}
