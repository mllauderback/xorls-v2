export interface MouseEventHandler {
    selectOnEvent(e: MouseEvent): any | null;
    onMouseDown(e: MouseEvent, data: any): void
    onMouseUp(e: MouseEvent, data: any): void;
    onMouseClick(e: MouseEvent, data: any): void;
    onMouseMove(e: MouseEvent, data: any): void;
    onMouseDrag(e: MouseEvent, data: any): void;
}