import { createFeature, createReducer, on } from "@ngrx/store";
import type { SettingsState } from "./state";
import * as actions from './actions';
import * as functions from "./reducer-functions";

/** How many pixels a grid cell is until the settings say otherwise. */
export const DEFAULT_GRID_SPACING = 20;

export const initialSettingsState: SettingsState = { // eventually load these from a database on startup
    leftPanelResizeByPct: true,
    leftPanelWidth: 30,
    workspaceSettings: {
        gridSettings: {
            gridSpacing: DEFAULT_GRID_SPACING,
            gridMode: 'dots'
        }
    }
};

export const settingsReducer = createReducer(
    initialSettingsState,
    on(
        actions.updateSettings,
        (_state, { settings }): SettingsState =>
            functions.setUpdatedSettings(settings)
    ),
    on(
        actions.updateGridSpacing,
        (state, { spacing }): SettingsState =>
            functions.setGridSpacing(state, spacing)
    ),
    on(
        actions.updateGridMode,
        (state, { mode }): SettingsState =>
            functions.setGridMode(state, mode)
    )
);

export const settingsFeature = createFeature({
    name: 'settingsFeature',
    reducer: settingsReducer
    // extraSelectors: ({}) => ({})

    /* example extraSelectors
    extraSelectors({ selector1, selector2 }) => ({
        extraSelectorName: createSelector(
            selector1,
            selector2,
            (associatedParameter1, associatedParameter2) => {
                // do stuff
                return state value
            }
        )
    })
    */
});

export const {
    name,
    reducer,
    selectSettingsFeatureState,
    selectLeftPanelResizeByPct,
    selectLeftPanelWidth,
    selectWorkspaceSettings,
} = settingsFeature;