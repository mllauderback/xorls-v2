import { Component, inject } from '@angular/core';
import { WorkspacePresenterComponent } from "../presenter/workspace.presenter.component";
import { filter, type Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import type { SettingsState, WorkspaceSettingsState } from '../../../store/settings/state';
import { CommonModule } from '@angular/common';
import { selectWorkspaceSettings } from '../../../store/settings/feature';

@Component({
    selector: 'app-workspace-container',
    imports: [
        CommonModule,
        WorkspacePresenterComponent
    ],
    template: `
    <app-workspace-presenter
        [workspaceSettings]="workspaceSettings$ | async"
    />
  `,
})
export class WorkspaceContainerComponent {
    private store = inject<Store<SettingsState>>(Store);

    protected workspaceSettings$: Observable<WorkspaceSettingsState>;
    
    constructor() {
        this.workspaceSettings$ = this.store.select(selectWorkspaceSettings).pipe(
            filter((settings): settings is WorkspaceSettingsState => settings != null) // ignore lint error - != covers undefined as well
        );
    }
}
