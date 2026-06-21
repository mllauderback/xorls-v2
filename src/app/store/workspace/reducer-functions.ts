import type { Point } from '../../models/Point';
import type { MouseMode, WorkspaceState } from './state';

export function setMouseMode(state: WorkspaceState, mouseMode: MouseMode) {
    return {
        ...state,
        mouseMode
    };
}

export function setMousePosition(state: WorkspaceState, mousePosition: Point) {
    return {
        ...state,
        mousePosition
    };
}