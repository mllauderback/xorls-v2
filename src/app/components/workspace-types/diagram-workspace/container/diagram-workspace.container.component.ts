import { Component, inject } from "@angular/core";
import { DiagramWorkspaceComponent } from "../presenter/diagram-workspace.presenter.component";
import { filter, Observable } from "rxjs";
import { WorkspaceSettingsState } from "../../../../store/settings/state";
import { Store } from "@ngrx/store";
import { selectWorkspaceSettings } from "../../../../store/settings/feature";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-diagram-workspace-container',
    template: `
    <app-diagram-presenter-workspace
        [workspaceSettings]="workspaceSettingsState$ | async"
    ></app-diagram-presenter-workspace>
    `,
    styles: '',
    imports: [DiagramWorkspaceComponent, CommonModule]
})
export class DiagramWorkspaceContainerComponent {
    private store: Store<WorkspaceSettingsState> = inject(Store);
    protected workspaceSettingsState$: Observable<WorkspaceSettingsState>;

    constructor() {
        this.workspaceSettingsState$ = this.store.select(selectWorkspaceSettings).pipe(
            filter((settings): settings is WorkspaceSettingsState => settings != null)
        );
    }

}