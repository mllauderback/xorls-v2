import { Component } from '@angular/core';
import { SplitterModule } from 'primeng/splitter';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { SettingsContainerComponent } from '../../settings/container/settings.container.component';
import { ComponentPaletteContainerComponent } from '../../component-palette/container/component-palette.container.component';
import { WorkspaceContainerComponent } from "../../workspace/container/workspace.component";


@Component({
  selector: 'app-left-panel-presenter',
  imports: [
    SplitterModule,
    TabsModule,
    TooltipModule,
    SettingsContainerComponent,
    ComponentPaletteContainerComponent,
    WorkspaceContainerComponent
],
  templateUrl: './left-panel.presenter.component.html',
  styleUrl: './left-panel.presenter.component.scss'
})
export class LeftPanelPresenterComponent {
}
