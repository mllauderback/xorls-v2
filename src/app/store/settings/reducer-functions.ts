import { type GridMode } from "../../components/canvas-layers/grid-canvas-layer/Grid";
import type { SettingsState } from "./state";

export function setUpdatedSettings(settings: SettingsState): SettingsState {
    return settings;
}

export function setGridSpacing(state: SettingsState, gridSpacing: number) {
    return {
        ...state,
        workspaceSettings: {
            ...state.workspaceSettings,
            gridSettings: {
                ...state.workspaceSettings.gridSettings,
                gridSpacing
            }
        }
    };
}

export function setGridMode(state: SettingsState, gridMode: GridMode) {
    return {
        ...state,
        workspaceSettings: {
            ...state.workspaceSettings,
            gridSettings: {
                ...state.workspaceSettings.gridSettings,
                gridMode
            }
        }
    };
}