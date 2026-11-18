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

export function setZoomScrollRate(state: SettingsState, scrollRate: number) {
    return {
        ...state,
        workspaceSettings: {
            ...state.workspaceSettings,
            zoomSettings: {
                ...state.workspaceSettings.zoomSettings,
                scrollRate
            }
        }
    }
}
export function setZoomPinchRate(state: SettingsState, pinchRate: number) {
    return {
        ...state,
        workspaceSettings: {
            ...state.workspaceSettings,
            zoomSettings: {
                ...state.workspaceSettings.zoomSettings,
                pinchRate
            }
        }
    }
}
export function setMinZoom(state: SettingsState, minZoom: number) {
    return {
        ...state,
        workspaceSettings: {
            ...state.workspaceSettings,
            zoomSettings: {
                ...state.workspaceSettings.zoomSettings,
                minZoom
            }
        }
    }
}
export function setMaxZoom(state: SettingsState, maxZoom: number) {
    return {
        ...state,
        workspaceSettings: {
            ...state.workspaceSettings,
            zoomSettings: {
                ...state.workspaceSettings.zoomSettings,
                maxZoom
            }
        }
    }
}
export function setZoomScrollInversion(state: SettingsState, invertScroll: boolean) {
    return {
        ...state,
        workspaceSettings: {
            ...state.workspaceSettings,
            zoomSettings: {
                ...state.workspaceSettings.zoomSettings,
                invertScroll
            }
        }
    }
}
