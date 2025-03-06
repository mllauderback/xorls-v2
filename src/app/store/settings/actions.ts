import { createAction, props } from "@ngrx/store";
import { SettingsState } from "./state";
import { type GridMode } from "../../models/Grid";

export const updateSettings     = createAction('Update settings from the left panel', props<{ settings: SettingsState }>());

export const updateGridSpacing  = createAction('Update grid spacing', props<{ spacing: number }>());
export const updateGridMode     = createAction('Update grid mode', props<{ mode: GridMode }>());