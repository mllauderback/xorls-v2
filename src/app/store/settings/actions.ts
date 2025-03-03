import { createAction, props } from "@ngrx/store";
import { SettingsState } from "./state";

export const updateSettings     = createAction('Update settings from the left panel', props<{ settings: SettingsState }>());