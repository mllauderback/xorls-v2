import { type GridMode } from "../../models/Grid";
import { SettingsState } from "./state";

export function setUpdatedSettings(settings: SettingsState): SettingsState {
    return settings;
}

export function setGridSpacing(state: SettingsState, gridSpacing: number) {
    return {
        ...state,
        gridSpacing
    };
}

export function setGridMode(state: SettingsState, gridMode: GridMode) {
    return {
        ...state,
        gridMode
    };
}