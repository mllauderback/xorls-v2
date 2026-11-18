import { createAction, props } from "@ngrx/store";
import type { SettingsState } from "./state";
import { type GridMode } from "../../components/canvas-layers/grid-canvas-layer/Grid";

export const updateSettings = createAction('Update settings from the left panel', props<{ settings: SettingsState }>());

/* Grid settings */
export const updateGridSpacing = createAction('Update grid spacing', props<{ spacing: number }>());
export const updateGridMode = createAction('Update grid mode', props<{ mode: GridMode }>());

/* Zoom settings */
export const updateZoomScrollRate = createAction('Update zoom scroll rate', props<{ scrollRate: number }>());
export const updateZoomPinchRate = createAction('Update zoom pinch rate', props<{ pinchRate: number }>());
export const updateMinZoom = createAction('Update minimum zoom factor', props<{ minZoom: number }>());
export const updateMaxZoom = createAction('Update maximum zoom factor', props<{ maxZoom: number }>());
export const setZoomScrollInversion = createAction('Set zoom scroll wheel inversion on or off', props<{ invertScroll: boolean }>());