import { inject, Injectable, NgZone } from "@angular/core";
import { filter, fromEvent, map, merge, Observable, share, switchMap, take, takeUntil } from "rxjs";

export const DEFAULT_CLICK_TOLERANCE = 2;

/**
 * A pointer event together with the pointer position relative to the top left corner of its scope
 */
export interface ScopedPointerEvent {
    event: PointerEvent;
    x: number;
    y: number;
}

export interface ElementPointerOptions {
    clickTolerance?: number;
}

/**
 * Pointer streams observing a single element's scope
 */
export interface ElementPointer {
    down$: Observable<ScopedPointerEvent>;
    move$: Observable<ScopedPointerEvent>;
    click$: Observable<ScopedPointerEvent>;
    drag$: Observable<ScopedPointerEvent>;
}

@Injectable({ providedIn: 'root' })
export class PointerService {
    private ngZone = inject(NgZone);

    readonly down$: Observable<PointerEvent> = this.windowEvent('pointerdown');
    readonly up$: Observable<PointerEvent> = this.windowEvent('pointerup');
    readonly move$: Observable<PointerEvent> = this.windowEvent('pointermove');
    readonly cancel$: Observable<PointerEvent> = this.windowEvent('pointercancel');

    /**
     * Returns and ElementPointer with ScopedPointerEvent streams for the given element.
     * Options include an override for the default pixel movement tolerance (2 pixels) allowed for click events.
     * @param element 
     * @param options 
     * @returns 
     */
    within(element: HTMLElement, options: ElementPointerOptions = {}): ElementPointer {
        const tolerance = options.clickTolerance ?? DEFAULT_CLICK_TOLERANCE;

        /** Returns true if event target is in the DOM tree and is a child of the element */
        const isInside = (event: PointerEvent) => event.target instanceof Node && element.contains(event.target);

        /** Returns a ScopedPointerEvent that converts the window x,y coords to local x,y coords for the element's bounding rectangle */
        const scope = (event: PointerEvent): ScopedPointerEvent => {
            const rect = element.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            return { event, x, y };
        };
        const pressesOnElement$ = this.down$.pipe(filter(down => isInside(down)));

        return {
            down$: pressesOnElement$.pipe(map(scope)),
            move$: this.move$.pipe(filter(move => isInside(move)), map(scope)),
            click$: pressesOnElement$.pipe(
                switchMap(down => this.up$.pipe(
                    take(1),
                    filter(up => Math.hypot(up.clientX - down.clientX, up.clientY - down.clientY) <= tolerance),
                    takeUntil(this.cancel$)
                )),
                map(scope)
            ),
            drag$: pressesOnElement$.pipe(
                switchMap(() => this.move$.pipe(takeUntil(merge(this.up$, this.cancel$)))),
                map(scope)
            )
        };
    }

    /**
     * 
     * @param type 
     * @returns 
     */
    private windowEvent(type: 'pointerdown' | 'pointerup' | 'pointermove' | 'pointercancel'): Observable<PointerEvent> {
        return new Observable<PointerEvent>(subscriber => {
            return this.ngZone.runOutsideAngular(() => {
                return fromEvent<PointerEvent>(window, type).subscribe(subscriber);
            });
        }).pipe(share());
    }
}