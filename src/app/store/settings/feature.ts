import { createFeature, createReducer, on } from "@ngrx/store";
import type { SettingsState, ZoomSettingsState } from "./state";
import * as actions from './actions';
import * as functions from "./reducer-functions";

/** How many pixels a grid cell is until the settings say otherwise. */
export const DEFAULT_GRID_SPACING = 20;

/** How scrolling zooms the diagram until the settings say otherwise. See ZoomSettingsState for what each one does. */
export const DEFAULT_ZOOM_SETTINGS: ZoomSettingsState = {
    scrollRate: 0.0015,
    pinchRate: 0.01,
    minZoom: 0.25,
    maxZoom: 5,
    invertScroll: false,
};

export const initialSettingsState: SettingsState = { // eventually load these from a database on startup
    leftPanelResizeByPct: true,
    leftPanelWidth: 30,
    workspaceSettings: {
        gridSettings: {
            gridSpacing: DEFAULT_GRID_SPACING,
            gridMode: 'dots'
        },
        zoomSettings: { ...DEFAULT_ZOOM_SETTINGS }
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
    ),
    on(
        actions.updateZoomScrollRate,
        (state, { scrollRate }): SettingsState =>
            functions.setZoomScrollRate(state, scrollRate)
    ),
    on(
        actions.updateZoomPinchRate,
        (state, { pinchRate }): SettingsState =>
            functions.setZoomPinchRate(state, pinchRate)
    ),
    on(
        actions.updateMinZoom,
        (state, { minZoom }): SettingsState =>
            functions.setMinZoom(state, minZoom)
    ),
    on(
        actions.updateMaxZoom,
        (state, { maxZoom }): SettingsState =>
            functions.setMaxZoom(state, maxZoom)
    ),
    on(
        actions.setZoomScrollInversion,
        (state, { invertScroll }): SettingsState =>
            functions.setZoomScrollInversion(state, invertScroll)
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