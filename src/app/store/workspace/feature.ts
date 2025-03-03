import { createFeature, createReducer } from "@ngrx/store";
import { WorkspaceState } from "./state";

export const initialWorkspaceState: WorkspaceState = {
    example: 4
};

export const workspaceReducer = createReducer(
    initialWorkspaceState
);

export const workspaceFeature = createFeature({
    name: 'workspaceFeature',
    reducer: workspaceReducer
})