import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Subscription } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ElementPointer, ScopedPointerEvent } from './pointer.service';
import { DEFAULT_CLICK_TOLERANCE, PointerService } from './pointer.service';

const fire = (target: EventTarget, type: string, x = 0, y = 0) =>
    target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }));

describe('PointerService', () => {
    let service: PointerService;
    let element: HTMLElement;
    let outside: HTMLElement;
    let pointer: ElementPointer;
    let subscriptions: Subscription[];

    /** Subscribes and records every emission; the subscription is closed after the test. */
    const record = <T>(source: { subscribe: (next: (value: T) => void) => Subscription }): T[] => {
        const values: T[] = [];
        subscriptions.push(source.subscribe(value => values.push(value)));
        return values;
    };

    beforeEach(() => {
        service = TestBed.inject(PointerService);
        subscriptions = [];

        element = document.createElement('div');
        outside = document.createElement('div');
        document.body.append(element, outside);
        // the element sits at (100, 50) on the page
        element.getBoundingClientRect = () => ({ left: 100, top: 50, right: 300, bottom: 250, width: 200, height: 200, x: 100, y: 50 } as DOMRect);

        pointer = service.within(element);
    });

    afterEach(() => {
        subscriptions.forEach(s => s.unsubscribe());
        element.remove();
        outside.remove();
    });

    describe('window streams', () => {
        it.each([
            ['down$', 'pointerdown'],
            ['up$', 'pointerup'],
            ['move$', 'pointermove'],
            ['cancel$', 'pointercancel'],
        ] as const)('should emit %s for %s anywhere in the window', (stream, type) => {
            const events = record(service[stream]);

            fire(outside, type);
            fire(document.body, type);
            fire(window, type);

            expect(events).toHaveLength(3);
        });

        it('should add one window listener per event type however many subscribers there are', () => {
            const add = vi.spyOn(window, 'addEventListener');
            record(service.move$);
            record(service.move$);
            record(service.move$);

            expect(add.mock.calls.filter(([type]) => type === 'pointermove')).toHaveLength(1);
            add.mockRestore();
        });

        it('should remove the window listener when the last subscriber leaves', () => {
            const remove = vi.spyOn(window, 'removeEventListener');
            const a = service.move$.subscribe();
            const b = service.move$.subscribe();

            a.unsubscribe();
            expect(remove.mock.calls.filter(([type]) => type === 'pointermove')).toHaveLength(0);
            b.unsubscribe();
            expect(remove.mock.calls.filter(([type]) => type === 'pointermove')).toHaveLength(1);
            remove.mockRestore();
        });

        it('should add its window listeners outside the Angular zone, even when subscribed to inside it', () => {
            const ngZone = TestBed.inject(NgZone);
            const runOutside = vi.spyOn(ngZone, 'runOutsideAngular');

            ngZone.run(() => {
                subscriptions.push(service.move$.subscribe());
            });

            expect(runOutside).toHaveBeenCalled();
        });

        it('should deliver events outside the Angular zone, even to a subscriber inside it', () => {
            const ngZone = TestBed.inject(NgZone);
            const insideZone: boolean[] = [];
            ngZone.run(() => {
                subscriptions.push(service.move$.subscribe(() => insideZone.push(NgZone.isInAngularZone())));
            });

            // the browser dispatches from the event loop, not from inside the zone, so do the same here
            fire(window, 'pointermove');

            expect(insideZone).toEqual([false]);
        });
    });

    describe('within', () => {
        it('should not add any listeners until it is subscribed to', () => {
            const add = vi.spyOn(window, 'addEventListener');
            service.within(element);
            expect(add.mock.calls.filter(([type]) => String(type).startsWith('pointer'))).toHaveLength(0);
            add.mockRestore();
        });

        describe('down$ and move$', () => {
            it('should emit for events on the element and its children', () => {
                const child = document.createElement('span');
                element.append(child);
                const downs = record(pointer.down$);
                const moves = record(pointer.move$);

                fire(element, 'pointerdown');
                fire(child, 'pointerdown');
                fire(child, 'pointermove');

                expect(downs).toHaveLength(2);
                expect(moves).toHaveLength(1);
            });

            it('should ignore events elsewhere', () => {
                const downs = record(pointer.down$);
                const moves = record(pointer.move$);

                fire(outside, 'pointerdown');
                fire(outside, 'pointermove');
                fire(document.body, 'pointermove');

                expect(downs).toEqual([]);
                expect(moves).toEqual([]);
            });

            it('should give the position relative to the element', () => {
                const moves = record<ScopedPointerEvent>(pointer.move$);

                fire(element, 'pointermove', 130, 90);

                expect(moves[0].x).toBe(30);
                expect(moves[0].y).toBe(40);
                expect(moves[0].event.clientX).toBe(130);
            });
        });

        describe('click$', () => {
            it('should emit when the pointer is pressed and released in the same place', () => {
                const clicks = record<ScopedPointerEvent>(pointer.click$);

                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointerup', 150, 100);

                expect(clicks).toHaveLength(1);
                expect(clicks[0].x).toBe(50);
                expect(clicks[0].y).toBe(50);
            });

            it('should still count a release within the tolerance, so a shaky click still works', () => {
                const clicks = record(pointer.click$);

                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointerup', 150 + DEFAULT_CLICK_TOLERANCE, 100);

                expect(clicks).toHaveLength(1);
            });

            it('should measure the tolerance as straight-line distance', () => {
                const clicks = record(pointer.click$);

                // 3px on each axis is about 4.24px
                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointerup', 153, 103);

                expect(clicks).toHaveLength(0);
            });

            it('should not emit when the pointer moved further than the tolerance', () => {
                const clicks = record(pointer.click$);

                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointerup', 150 + DEFAULT_CLICK_TOLERANCE + 1, 100);

                expect(clicks).toEqual([]);
            });

            it('should use the tolerance given for the element', () => {
                const clicks = record(service.within(element, { clickTolerance: 20 }).click$);

                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointerup', 165, 100);

                expect(clicks).toHaveLength(1);
            });

            it('should not emit when the press was cancelled', () => {
                const clicks = record(pointer.click$);

                fire(element, 'pointerdown', 150, 100);
                fire(window, 'pointercancel', 150, 100);
                fire(window, 'pointerup', 150, 100);

                expect(clicks).toEqual([]);
            });

            it('should not emit when the press started elsewhere', () => {
                const clicks = record(pointer.click$);

                fire(outside, 'pointerdown', 150, 100);
                fire(element, 'pointerup', 150, 100);

                expect(clicks).toEqual([]);
            });

            it('should not emit for a release without a press', () => {
                const clicks = record(pointer.click$);

                fire(element, 'pointerup', 150, 100);

                expect(clicks).toEqual([]);
            });

            it('should emit once per press, not again for a stray second release', () => {
                const clicks = record(pointer.click$);

                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointerup', 150, 100);
                fire(element, 'pointerup', 150, 100);

                expect(clicks).toHaveLength(1);
            });

            it('should emit again for each new press', () => {
                const clicks = record(pointer.click$);

                for (let i = 0; i < 3; i++) {
                    fire(element, 'pointerdown', 150, 100);
                    fire(element, 'pointerup', 150, 100);
                }

                expect(clicks).toHaveLength(3);
            });
        });

        describe('drag$', () => {
            it('should emit moves while the pointer is pressed', () => {
                const drags = record(pointer.drag$);

                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointermove', 160, 100);
                fire(element, 'pointermove', 170, 100);

                expect(drags).toHaveLength(2);
            });

            it('should not emit moves before the press', () => {
                const drags = record(pointer.drag$);

                fire(element, 'pointermove', 160, 100);

                expect(drags).toEqual([]);
            });

            it('should stop at release', () => {
                const drags = record(pointer.drag$);

                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointermove', 160, 100);
                fire(element, 'pointerup', 160, 100);
                fire(element, 'pointermove', 170, 100);

                expect(drags).toHaveLength(1);
            });

            it('should stop when the pointer is cancelled', () => {
                const drags = record(pointer.drag$);

                fire(element, 'pointerdown', 150, 100);
                fire(window, 'pointercancel');
                fire(element, 'pointermove', 160, 100);

                expect(drags).toEqual([]);
            });

            it('should keep going when the pointer leaves the element', () => {
                const drags = record<ScopedPointerEvent>(pointer.drag$);

                fire(element, 'pointerdown', 150, 100);
                fire(outside, 'pointermove', 400, 100);

                expect(drags).toHaveLength(1);
                expect(drags[0].x).toBe(300); // relative to the element, even though it's outside of it
            });

            it('should not start from a press elsewhere', () => {
                const drags = record(pointer.drag$);

                fire(outside, 'pointerdown', 500, 500);
                fire(outside, 'pointermove', 510, 500);

                expect(drags).toEqual([]);
            });

            it('should restart on the next press', () => {
                const drags = record(pointer.drag$);

                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointerup', 150, 100);
                fire(element, 'pointerdown', 150, 100);
                fire(element, 'pointermove', 160, 100);

                expect(drags).toHaveLength(1);
            });
        });

        it('should keep the streams of two elements apart', () => {
            const other = document.createElement('div');
            document.body.append(other);
            const otherPointer = service.within(other);
            const mine = record(pointer.move$);
            const theirs = record(otherPointer.move$);

            fire(element, 'pointermove');
            fire(other, 'pointermove');
            fire(other, 'pointermove');

            expect(mine).toHaveLength(1);
            expect(theirs).toHaveLength(2);
            other.remove();
        });
    });
});