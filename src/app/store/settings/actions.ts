import { createAction, props } from "@ngrx/store";
import type { SettingsState } from "./state";
import { type GridMode } from "../../components/canvas-layers/grid-canvas-layer/Grid";

export const updateSettings     = createAction('Update settings from the left panel', props<{ settings: SettingsState }>());

export const updateGridSpacing  = createAction('Update grid spacing', props<{ spacing: number }>());
export const updateGridMode     = createAction('Update grid mode', props<{ mode: GridMode }>());