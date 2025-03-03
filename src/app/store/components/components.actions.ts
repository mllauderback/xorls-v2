import { createAction, props } from "@ngrx/store";
import { PaletteComponentCategories, PaletteComponentList } from "./components.state";
import { PaletteComponent } from "../../models/components/PaletteComponent";


export const setPaletteComponentMap     = createAction('Update selected palette component list', props<{ paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]> }>());
