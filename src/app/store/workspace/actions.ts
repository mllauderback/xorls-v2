import { createAction, props } from "@ngrx/store";
import { MouseMode } from "./state";
import { Point } from "../../models/Point";
import { GridMode } from "../../models/Grid";

export const updateMouseMode = createAction('Update mouse mode', props<{ mode: MouseMode }>());
export const updateMousePosition = createAction('Update mouse position', props<{ position: Point }>());