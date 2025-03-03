import { createAction, props } from "@ngrx/store";
import { PaletteComponentList } from "./components.state";


export const setPaletteComponentList     = createAction('Update selected palette component list', props<{ paletteComponentList: PaletteComponentList } >());
