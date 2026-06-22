import { type GridMode } from "../../models/Grid";

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