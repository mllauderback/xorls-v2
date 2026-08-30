import { Directive } from "@angular/core";
import type { Observable } from "rxjs";
import type { WorkspaceSettingsState } from "../../store/settings/state";
import type { CodeWorkspaceState, DiagramWorkspaceState } from "../../store/workspace/state";

@Directive()
export abstract class AbstractWorkspaceComponent {
    protected abstract id: string;
    protected abstract workspaceSettings$: Observable<WorkspaceSettingsState>;
    protected abstract workspaceState$: Observable<DiagramWorkspaceState | CodeWorkspaceState>;
}