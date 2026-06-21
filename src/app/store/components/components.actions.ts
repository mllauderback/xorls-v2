import { createAction, props } from "@ngrx/store";
import type { PaletteComponentCategories } from "./components.state";
import type { PaletteComponent } from "../../models/components/PaletteComponent";


export const setPaletteComponentMap     = createAction('Update selected palette component list', props<{ paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]> }>());
