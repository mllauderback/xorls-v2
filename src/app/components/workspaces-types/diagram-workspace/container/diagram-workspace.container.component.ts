import { Component, inject, Input } from "@angular/core";
import { AbstractWorkspaceComponent } from "../../abstract-workspace.component";
import { Store } from "@ngrx/store";
import type { WorkspaceSettingsState } from "../../../../store/settings/state";
import { selectWorkspaceSettings } from "../../../../store/settings/feature";
import type { Observable } from "rxjs";
import { filter } from "rxjs";
import type { CodeWorkspaceState, DiagramWorkspaceState, WorkspaceState } from "../../../../store/workspace/state";
import { selectDiagramWorkspaceState } from "../../../../store/workspace/feature";
import * as workspaceActions from "../../../../store/workspace/actions";
import { selectSelectedSelectable } from "../../../../store/components/feature";
import * as componentActions from "../../../../store/components/actions";
import type { PaletteComponentsState, SelectedSelectable } from "../../../../store/components/state";
import { DiagramWorkspacePresenterComponent } from "../presenter/diagram-workspace.presenter.component";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-diagram-workspace-container',
    imports: [CommonModule, DiagramWorkspacePresenterComponent],
    template: `
        <app-diagram-workspace-presenter
            [id]="id"
            [workspaceSettings]="workspaceSettings$ | async"
            [workspaceState]="workspaceState$ | async"
            [selectedSelectable]="selectedSelectable$ | async"
            (componentPlaced)="onComponentPlaced()"
            (selectionCleared)="onSelectionCleared()"
        ></app-diagram-workspace-presenter>
    `
})
export class DiagramWorkspaceContainerComponent extends AbstractWorkspaceComponent {
    @Input({ required: true }) id!: string;
    private settingsStore: Store<WorkspaceSettingsState> = inject(Store);
    private workspaceStore: Store<WorkspaceState> = inject(Store);
    private componentsStore: Store<PaletteComponentsState> = inject(Store);
    protected override workspaceSettings$: Observable<WorkspaceSettingsState>;
    protected override workspaceState$: Observable<DiagramWorkspaceState | CodeWorkspaceState>;
    protected selectedSelectable$: Observable<SelectedSelectable>;

    constructor() {
        super();
        this.workspaceSettings$ = this.settingsStore.select(selectWorkspaceSettings).pipe(
            filter((settings): settings is WorkspaceSettingsState => settings !== null && settings !== undefined)
        );
        this.workspaceState$ = this.workspaceStore.select(selectDiagramWorkspaceState).pipe(
            filter((workspace): workspace is WorkspaceState => workspace !== null && workspace !== undefined)
        );
        this.selectedSelectable$ = this.componentsStore.select(selectSelectedSelectable);
    }

    /** The presenter placed the previewed component: the palette selection is finished and the mouse goes back to selecting. */
    protected onComponentPlaced() {
        this.componentsStore.dispatch(componentActions.placeSelectedPaletteComponent());
        this.workspaceStore.dispatch(workspaceActions.updateMouseMode({ mode: 'select' }));
    }

    /** Esc was pressed: drop the ghost or deselect the placed component, un-highlight the palette, and go back to selecting. */
    protected onSelectionCleared() {
        this.componentsStore.dispatch(componentActions.clearSelection());
        this.workspaceStore.dispatch(workspaceActions.updateMouseMode({ mode: 'select' }));
    }
}