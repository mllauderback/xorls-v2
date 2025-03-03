import { Component } from '@angular/core';
import { SplitterModule } from 'primeng/splitter';
import { TabsModule } from 'primeng/tabs';
import { SettingsContainerComponent } from '../../settings/container/settings.container.component';
import { ComponentPaletteContainerComponent } from '../../component-palette/container/component-palette.container.component';


@Component({
  selector: 'app-left-panel-presenter',
  imports: [
    SplitterModule,
    TabsModule,
    SettingsContainerComponent,
    ComponentPaletteContainerComponent
  ],
  templateUrl: './left-panel.presenter.component.html',
  styleUrl: './left-panel.presenter.component.scss'
})
export class LeftPanelPresenterComponent {
}
