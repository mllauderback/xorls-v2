import { DestroyRef, inject, Injectable, NgZone } from "@angular/core";
import { filter, fromEvent, map, merge, Observable, share, switchMap, take, takeUntil } from "rxjs";
import { isEditableTarget } from "../service-helpers";

export const DEFAULT_CLICK_TOLERANCE = 2;

/** The values of MouseEvent.button. */
export const MouseButton = { Left: 0, Middle: 1, Right: 2 } as const;

/**
 * A pointer event together with the pointer position relative to the top left corner of its scope
 */
export interface ScopedPointerEvent {
    event: PointerEvent;
    x: number;
    y: number;
}

/**
 * A wheel event together with the pointer position relative to the top left corner of its scope
 */
export interface ScopedWheelEvent {
    event: WheelEvent;
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
    /**
     * Wheel and trackpad scrolls over the element, pinches included (browsers report a pinch as a wheel event with
     * ctrlKey). Subscribers may call preventDefault() to keep the scroll from scrolling the page. Scrolls anywhere
     * else are never seen, so they scroll normally.
     */
    wheel$: Observable<ScopedWheelEvent>;
    /**
     * The pointer coming over the element from outside it: once each time, not again while it moves over the element
     * or between its children.
     */
    enter$: Observable<ScopedPointerEvent>;
}

@Injectable({ providedIn: 'root' })
export class PointerService {
    private ngZone = inject(NgZone);
    private destroyRef = inject(DestroyRef);

    readonly down$: Observable<PointerEvent> = this.listen(window, 'pointerdown');
    readonly up$: Observable<PointerEvent> = this.listen(window, 'pointerup');
    readonly move$: Observable<PointerEvent> = this.listen(window, 'pointermove');
    readonly cancel$: Observable<PointerEvent> = this.listen(window, 'pointercancel');

    /**
     * Cancels a middle press, unless it is on an editable field: on Linux it pastes the primary selection there.
     * The browser ignores a listener that is already there.
     */
    private readonly cancelMiddlePress = (event: MouseEvent) => {
        if (event.button !== MouseButton.Middle || isEditableTarget(event.target)) return;
        event.preventDefault();
    };

    constructor() {
        this.destroyRef.onDestroy(() => window.removeEventListener('mousedown', this.cancelMiddlePress, { capture: true }));
    }

    /**
     * Keeps a middle press anywhere in the app from starting the browser's autoscroll, which the app never uses: the
     * middle button pans the diagram instead. Presses on editable fields are left alone, so middle-click paste still
     * works on Linux.
     *
     * It cancels mousedown rather than pointerdown, because autoscroll is mousedown's default action and cancelling
     * pointerdown doesn't reliably stop it. It listens in the capture phase, so it sees every middle press before
     * anything on the page can stop the event from reaching the window.
     *
     * Call it once at startup (app.config does). Calling it again does nothing, and it lasts until the app is destroyed.
     */
    preventMiddleClickAutoscroll(): void {
        this.ngZone.runOutsideAngular(() => window.addEventListener('mousedown', this.cancelMiddlePress, { capture: true }));
    }

    /**
     * Returns an ElementPointer with ScopedPointerEvent streams for the given element.
     *
     * @param element The element whose presses, moves, clicks and drags to observe
     * @param options clickTolerance overrides how far, in pixels, the pointer may move between press and release for
     * it to still be a click (2 by default)
     */
    within(element: HTMLElement, options: ElementPointerOptions = {}): ElementPointer {
        const tolerance = options.clickTolerance ?? DEFAULT_CLICK_TOLERANCE;

        /** Returns true if event target is in the DOM tree and is a child of the element */
        function isInside(event: PointerEvent) {
            return event.target instanceof Node && element.contains(event.target);
        }

        /** Returns a ScopedPointerEvent that converts the window x,y coords to local x,y coords for the element's bounding rectangle */
        function scope<T extends MouseEvent>(event: T): { event: T, x: number, y: number } {
            const rect = element.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            return { event, x, y };
        }
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
            ),
            wheel$: this.listen(element, 'wheel', { passive: false }).pipe(map(scope)),
            enter$: this.listen(element, 'pointerenter', { passive: true }).pipe(map(scope))
        };
    }

    /**
     * A stream of one type of event on the window or an element, listened to outside the Angular zone.
     * Its subscribers share one listener.  The type of event is determined by its name: 'wheel' gives 
     * WheelEvents, 'pointerdown' gives PointerEvents.
     * 
     * @param target window or element
     * @param type event type ('pointerdown', etc)
     * @param options 
     * @returns Observable of an event
     */
    private listen<K extends keyof HTMLElementEventMap>(
        target: Window | HTMLElement,
        type: K,
        options: AddEventListenerOptions = {}
    ): Observable<HTMLElementEventMap[K]> {
        return new Observable<HTMLElementEventMap[K]>(subscriber => {
            return this.ngZone.runOutsideAngular(() => {
                return fromEvent<HTMLElementEventMap[K]>(target, type, options).subscribe(subscriber);
            });
        }).pipe(share());
    }
}