import { Component, inject, Input, NgZone } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AbstractWorkspaceComponent } from "../../abstract-workspace.component";
import { Store } from "@ngrx/store";
import type { WorkspaceSettingsState } from "../../../../store/settings/state";
import { selectWorkspaceSettings } from "../../../../store/settings/feature";
import type { Observable } from "rxjs";
import { filter } from "rxjs";
import type { CodeWorkspaceState, DiagramWorkspaceState, WorkspaceState } from "../../../../store/workspace/state";
import { selectDiagramWorkspaceState } from "../../../../store/workspace/feature";
import * as workspaceActions from "../../../../store/workspace/actions";
import { selectSelectableProperties, selectSelectedPaletteComponent, selectSelectedSelectable } from "../../../../store/components/feature";
import * as componentActions from "../../../../store/components/actions";
import type { PaletteComponentsState, SelectableProperties } from "../../../../store/components/state";
import { DiagramWorkspacePresenterComponent } from "../presenter/diagram-workspace.presenter.component";
import { CommonModule } from "@angular/common";
import { DiagramController } from "../controller/diagram.controller";
import type { DiagramView } from "../controller/diagram-view";

@Component({
    selector: 'app-diagram-workspace-container',
    imports: [CommonModule, DiagramWorkspacePresenterComponent],
    template: `
        <app-diagram-workspace-presenter
            [id]="id"
            [workspaceSettings]="workspaceSettings$ | async"
            [workspaceState]="workspaceState$ | async"
            (viewReady)="onViewReady($event)"
        ></app-diagram-workspace-presenter>
    `,
    providers: [DiagramController],
    styles: `:host { display: block; width: 100%; height: 100%; }`
})
export class DiagramWorkspaceContainerComponent extends AbstractWorkspaceComponent {
    @Input({ required: true }) id!: string;
    private settingsStore: Store<WorkspaceSettingsState> = inject(Store);
    private workspaceStore: Store<WorkspaceState> = inject(Store);
    private componentsStore: Store<PaletteComponentsState> = inject(Store);
    protected override workspaceSettings$: Observable<WorkspaceSettingsState>;
    protected override workspaceState$: Observable<DiagramWorkspaceState | CodeWorkspaceState>;
    private controller = inject(DiagramController);
    private zone = inject(NgZone);

    constructor() {
        super();
        this.workspaceSettings$ = this.settingsStore.select(selectWorkspaceSettings).pipe(
            filter((settings): settings is WorkspaceSettingsState => settings !== null && settings !== undefined)
        );
        this.workspaceState$ = this.workspaceStore.select(selectDiagramWorkspaceState).pipe(
            filter((workspace): workspace is WorkspaceState => workspace !== null && workspace !== undefined)
        );

        // The controller handles the interactions. The container tells it what the store holds and acts on what it reports.
        this.componentsStore.select(selectSelectedPaletteComponent).pipe(takeUntilDestroyed())
            .subscribe(paletteComponent => this.controller.setPaletteComponent(paletteComponent));
        this.componentsStore.select(selectSelectedSelectable).pipe(takeUntilDestroyed())
            .subscribe(selectable => this.controller.setSelectedSelectable(selectable));
        this.componentsStore.select(selectSelectableProperties).pipe(takeUntilDestroyed())
            .subscribe(properties => this.controller.setSelectableProperties(properties));
        this.controller.propertiesLoaded$.pipe(takeUntilDestroyed())
            .subscribe(properties => this.onPropertiesLoaded(properties));
        this.workspaceSettings$.pipe(takeUntilDestroyed())
            .subscribe(settings => this.controller.setWorkspaceSettings(settings));
        this.controller.selectionCleared$.pipe(takeUntilDestroyed())
            .subscribe(() => this.onSelectionCleared());
    }

    /** The presenter's layers exist: let the controller take over the interactions with it. */
    protected onViewReady(view: DiagramView) {
        this.controller.attach(view, this.id);
    }

    /**
     * The controller made a ghost the store has no properties for: show its properties. It can make one while
     * following the mouse, outside the Angular zone, so the panel is told inside it.
     */
    protected onPropertiesLoaded(properties: SelectableProperties) {
        this.zone.run(() => this.componentsStore.dispatch(componentActions.loadSelectableProperties({ properties })));
    }

    /** Esc was pressed: end the placement and deselect the placed component, un-highlight the palette, and go back to selecting. */
    protected onSelectionCleared() {
        this.componentsStore.dispatch(componentActions.clearSelection());
        this.workspaceStore.dispatch(workspaceActions.updateMouseMode({ mode: 'select' }));
    }
}