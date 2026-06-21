import { createFeature, createReducer, on } from "@ngrx/store";
import type { WorkspaceState } from "./state";
import * as actions from './actions';
import * as functions from './reducer-functions';

export const initialWorkspaceState: WorkspaceState = {
    mouseMode: 'select',
    mousePosition: { x: 0, y: 0},
};

export const workspaceReducer = createReducer(
    initialWorkspaceState,

    on(
        actions.updateMouseMode,
        (state, { mode }): WorkspaceState =>
            functions.setMouseMode(state, mode)      
    ),
    on(
        actions.updateMousePosition,
        (state, { position }): WorkspaceState =>
            functions.setMousePosition(state, position)
    )
);

export const workspaceFeature = createFeature({
    name: 'workspaceFeature',
    reducer: workspaceReducer,
    // extraSelectors: ({}) => ({})
});

export const {
    name,
    reducer,
    selectMouseMode,
    selectMousePosition,
} = workspaceFeature;