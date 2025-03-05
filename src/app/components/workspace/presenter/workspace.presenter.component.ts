import { Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-workspace-presenter',
  imports: [
    TabsModule,
    ButtonModule
  ],
  templateUrl: './workspace.presenter.component.html',
  styleUrl: './workspace.presenter.component.scss'
})
export class WorkspacePresenterComponent {
  // Will need to keep track of tabs programatically as an array.

  // will eventuall add the tab index as an argument
  protected closeTab() {
    // closing tab removes it from the tab array which automatically updates
    // the view.
  }

}
