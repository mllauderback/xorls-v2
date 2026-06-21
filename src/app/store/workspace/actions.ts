import { createAction, props } from "@ngrx/store";
import type { MouseMode } from "./state";
import type { Point } from "../../models/Point";

export const updateMouseMode = createAction('Update mouse mode', props<{ mode: MouseMode }>());
export const updateMousePosition = createAction('Update mouse position', props<{ position: Point }>());