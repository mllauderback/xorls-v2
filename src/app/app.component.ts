import { Component } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import { SplitterModule } from 'primeng/splitter';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { SettingsContainerComponent } from './components/settings/container/settings.container.component';
import { ComponentPaletteContainerComponent } from './components/component-palette/container/component-palette.container.component';
import { WorkspaceTabsComponent } from './components/workspace-tabs/workspace-tabs.component';
import { StatusbarComponent } from './components/statusbar/statusbar.component';

@Component({
    selector: 'app-root',
    imports: [
        // RouterOutlet,
        StatusbarComponent,
        SplitterModule,
        TabsModule,
        TooltipModule,
        SettingsContainerComponent,
        ComponentPaletteContainerComponent,
        WorkspaceTabsComponent,
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
    title = 'xorls';
}
