import type { PaletteComponent } from "../../models/components/PaletteComponent";
import type { Selectable } from "../../models/Selectable";

export enum PaletteComponentCategories {
    gates = "Gates",
    io = "I/O",
    decorations = "Decorations"
}

export interface PaletteComponentList { // make this a map
    "Gates": PaletteComponent[];
    "I/O": PaletteComponent[];
    "Decorations": PaletteComponent[];
    // more categories ...
}

export interface SelectedSelectable {
    selectable: Selectable | null;
    concreteClassName: string;
}

export interface PaletteComponentsState {
    paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]>;
    selectedSelectable: SelectedSelectable;
}