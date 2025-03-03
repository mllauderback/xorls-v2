import { type Action, createFeature, createReducer, on } from "@ngrx/store";
import { SettingsState } from "./state";
import * as actions from './actions';
import * as functions from "./reducer-functions";

export const initialSettingsState: SettingsState = { // eventually read these from local storage
    leftPanelResizeByPct: true,
    leftPanelWidth: 30
};

export const settingsReducer = createReducer(
    initialSettingsState,

    on(
        actions.updateSettings,
        (_state, { settings }): SettingsState =>
            functions.setUpdatedSettings(settings)
    ),
);

export const settingsFeature = createFeature({
    name: 'settingsFeature',
    reducer: settingsReducer,
    extraSelectors: ({}) => ({})

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
})