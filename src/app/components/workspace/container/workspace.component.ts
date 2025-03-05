import { Component } from '@angular/core';
import { WorkspacePresenterComponent } from "../presenter/workspace.presenter.component";

@Component({
  selector: 'app-workspace-container',
  imports: [WorkspacePresenterComponent],
  template: `
    <app-workspace-presenter
      
    />
  `,
})
export class WorkspaceContainerComponent {

}
