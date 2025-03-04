import { PaletteComponent } from "../../models/components/PaletteComponent";
import { Selectable } from "../../models/Selectable";

export enum PaletteComponentCategories {
    gates = "Gates",
    io = "I/O",
    decorations = "Decorations"
}

export type PaletteComponentList = { // make this a map
    "Gates": PaletteComponent[];
    "I/O": PaletteComponent[];
    "Decorations": PaletteComponent[];
    // more categories ...
}

export type SelectedSelectable = {
    selectable: Selectable | null;
    concreteClassName: string;
}

export interface PaletteComponentsState {
    paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]>;
    selectedSelectable: SelectedSelectable;
}