import { Component, Input, Type } from '@angular/core';
import { Selectable } from '../../../models/Selectable';
import { DividerModule } from 'primeng/divider';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { SelectedSelectable } from '../../../store/components/components.state';
import { AndGate } from '../../../models/components/gates';

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
  @Input() selectable!: SelectedSelectable | null; // possibly null bc of async


  getConcreteSelectable(): any {
    if (!this.selectable?.selectable) return null;
    switch(this.selectable?.concreteClassName) {
      case AndGate.name:
        return this.selectable.selectable as AndGate;
      
      default:
        return null;
    }
  }
}
