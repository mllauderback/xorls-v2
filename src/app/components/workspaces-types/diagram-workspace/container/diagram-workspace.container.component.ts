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
import { selectSelectedPaletteComponent, selectSelectedSelectable } from "../../../../store/components/feature";
import type { PaletteComponent } from "../../../../models/components/PaletteComponent";
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
            [selectedPaletteComponent]="selectedPaletteComponent$ | async"
            [selectedSelectable]="selectedSelectable$ | async"
            (selectionCleared)="onSelectionCleared()"
        ></app-diagram-workspace-presenter>
    `,
    styles: `:host { display: block; width: 100%; height: 100%; }`
})
export class DiagramWorkspaceContainerComponent extends AbstractWorkspaceComponent {
    @Input({ required: true }) id!: string;
    private settingsStore: Store<WorkspaceSettingsState> = inject(Store);
    private workspaceStore: Store<WorkspaceState> = inject(Store);
    private componentsStore: Store<PaletteComponentsState> = inject(Store);
    protected override workspaceSettings$: Observable<WorkspaceSettingsState>;
    protected override workspaceState$: Observable<DiagramWorkspaceState | CodeWorkspaceState>;
    protected selectedPaletteComponent$: Observable<PaletteComponent | null>;
    protected selectedSelectable$: Observable<SelectedSelectable | null>;

    constructor() {
        super();
        this.workspaceSettings$ = this.settingsStore.select(selectWorkspaceSettings).pipe(
            filter((settings): settings is WorkspaceSettingsState => settings !== null && settings !== undefined)
        );
        this.workspaceState$ = this.workspaceStore.select(selectDiagramWorkspaceState).pipe(
            filter((workspace): workspace is WorkspaceState => workspace !== null && workspace !== undefined)
        );
        this.selectedPaletteComponent$ = this.componentsStore.select(selectSelectedPaletteComponent);
        this.selectedSelectable$ = this.componentsStore.select(selectSelectedSelectable);
    }

    /** Esc was pressed: end the placement and deselect the placed component, un-highlight the palette, and go back to selecting. */
    protected onSelectionCleared() {
        this.componentsStore.dispatch(componentActions.clearSelection());
        this.workspaceStore.dispatch(workspaceActions.updateMouseMode({ mode: 'select' }));
    }
}