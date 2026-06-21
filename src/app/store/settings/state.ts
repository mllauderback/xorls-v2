import { type GridMode } from "../../models/Grid";

export interface SettingsState {
    leftPanelResizeByPct: boolean;
    leftPanelWidth: number;
    gridSpacing: number;
    gridMode: GridMode;
}