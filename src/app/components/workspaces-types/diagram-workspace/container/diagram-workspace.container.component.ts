import { Component, inject, Input } from "@angular/core";
import { AbstractWorkspaceComponent } from "../../abstract-workspace.component";
import { Store } from "@ngrx/store";
import type { WorkspaceSettingsState } from "../../../../store/settings/state";
import { selectWorkspaceSettings } from "../../../../store/settings/feature";
import type { Observable } from "rxjs";
import { filter, take } from "rxjs";
import type { CodeWorkspaceState, DiagramWorkspaceState, WorkspaceState } from "../../../../store/workspace/state";
import { selectDiagramWorkspaceState } from "../../../../store/workspace/feature";
import * as workspaceActions from "../../../../store/workspace/actions";
import { selectSelectedPaletteComponent, selectSelectedSelectable } from "../../../../store/components/feature";
import { createPlaceable } from "../../../../models/components/ComponentFactory";
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

    /**
     * The presenter placed the previewed component. The palette component stays selected so it can be placed again:
     * a fresh ghost becomes the selection, which also releases the component that was just placed to its regular layer.
     * Only pressing esc or toggling the palette entry off ends the palette selection.
     */
    protected onComponentPlaced() {
        this.componentsStore.select(selectSelectedPaletteComponent).pipe(take(1)).subscribe(paletteComponent => {
            if (!paletteComponent) {
                // nothing left to place again
                this.workspaceStore.dispatch(workspaceActions.updateMouseMode({ mode: 'select' }));
                return;
            }
            // The ghost's position is set by the workspace as soon as it is selected, from the last pointer position.
            const selectable = createPlaceable(paletteComponent.className, { x: 0, y: 0 });
            selectable.isGhost = true;
            this.componentsStore.dispatch(componentActions.selectPaletteComponent({
                paletteComponent,
                selectable,
                concreteClassName: paletteComponent.className
            }));
        });
    }

    /** Esc was pressed: drop the ghost or deselect the placed component, un-highlight the palette, and go back to selecting. */
    protected onSelectionCleared() {
        this.componentsStore.dispatch(componentActions.clearSelection());
        this.workspaceStore.dispatch(workspaceActions.updateMouseMode({ mode: 'select' }));
    }
}