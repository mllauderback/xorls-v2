import type { Point } from "../Point";
import type { Selectable } from "../Selectable";
import { isGhostable } from "../Ghostable";
import type { Component } from "./Component";
import type { Decoration } from "./Decoration";
import * as gates from "./gates";
import * as io from "./io";
import * as decorations from "./decorations";

/** Anything the palette can put into a diagram. */
export type Placeable = Component | Decoration;

// Placeholders until the properties panel supplies these values.
const DEFAULT_INPUT_NODE_COUNT = 2;
const DEFAULT_BUS_WIDTH = 4;

const factories: Record<string, (position: Point) => Placeable> = {
    [gates.AndGate.name]: p => new gates.AndGate(p, DEFAULT_INPUT_NODE_COUNT),
    [gates.OrGate.name]: p => new gates.OrGate(p, DEFAULT_INPUT_NODE_COUNT),
    [gates.XorGate.name]: p => new gates.XorGate(p, DEFAULT_INPUT_NODE_COUNT),
    [gates.NotGate.name]: p => new gates.NotGate(p),
    [gates.Buffer.name]: p => new gates.Buffer(p),
    [gates.NandGate.name]: p => new gates.NandGate(p, DEFAULT_INPUT_NODE_COUNT),
    [gates.NorGate.name]: p => new gates.NorGate(p, DEFAULT_INPUT_NODE_COUNT),
    [gates.XnorGate.name]: p => new gates.XnorGate(p, DEFAULT_INPUT_NODE_COUNT),
    [io.Input.name]: p => new io.Input(p),
    [io.Output.name]: p => new io.Output(p),
    [io.SevenSegmentDisplay.name]: p => new io.SevenSegmentDisplay(p, DEFAULT_BUS_WIDTH),
    [decorations.Text.name]: p => new decorations.Text(p),
};

/**
 * Creates a new, non-ghost component or decoration from a palette class name.
 * The caller decides whether the new instance is a ghost.
 *
 * @param className The palette component's class name (`SomeClass.name`)
 * @param position The position of the new instance, in diagram coordinates
 * @throws If the class name is not recognized
 */
export function createPlaceable(className: string, position: Point): Placeable {
    const create = factories[className];
    if (!create) {
        throw new Error(`Component name not recognized: ${className}`);
    }
    return create({ x: position.x, y: position.y });
}

/** True if the selectable is something createPlaceable() can produce, i.e. it can be previewed and placed. */
export function isPlaceable(selectable: Selectable | null | undefined): selectable is Placeable {
    return !!selectable
        && isGhostable(selectable)
        && 'position' in selectable
        && 'draw' in selectable
        && 'getBoundingBox' in selectable;
}

/** I/O components live on the I/O layers; everything else lives on the component layers. */
export function isIOComponent(selectable: Selectable): boolean {
    return selectable instanceof io.Input
        || selectable instanceof io.Output
        || selectable instanceof io.SevenSegmentDisplay;
}
