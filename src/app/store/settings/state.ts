import { type GridMode } from "../../components/canvas-layers/grid-canvas-layer/Grid";

export interface GridSettingsState {
    gridSpacing: number;
    gridMode: GridMode;   
}

export interface WorkspaceSettingsState {
    gridSettings: GridSettingsState
}

export interface SettingsState {
    leftPanelResizeByPct: boolean;
    leftPanelWidth: number;
    workspaceSettings: WorkspaceSettingsState;
}