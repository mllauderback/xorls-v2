import type { ComponentType } from "./Component";

export interface PaletteComponent {
    type: ComponentType;
    selected: boolean;
}