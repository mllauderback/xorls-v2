import type { Observable, Subscription } from "rxjs";
import { filter, fromEvent, share, startWith, Subject, switchMap, takeUntil } from "rxjs";
import type { DestroyRef} from "@angular/core";
import { inject, NgZone } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

export class MouseEventListener {
    private destroyRef: DestroyRef;
    private ngZone: NgZone;
    private mouseDown$!: Observable<MouseEvent>;
    private mouseDownSub?: Subscription;
    private mouseUp$!: Observable<MouseEvent>;
    private mouseUpSub?: Subscription;
    private mouseMove$!: Observable<MouseEvent>;
    private mouseMoveSub?: Subscription;
    private mouseDrag$!: Observable<MouseEvent>;
    private mouseDragSub?: Subscription;
    private mouseClick$!: Observable<MouseEvent>;
    private mouseClickSub?: Subscription;

    private viewportChangeSubject: Subject<HTMLElement>;
    private viewportChange$: Observable<HTMLElement>;
    private viewport?: HTMLElement;

    constructor(destroyRef: DestroyRef) {
        this.destroyRef = destroyRef;
        this.ngZone = inject(NgZone)
        this.viewportChangeSubject = new Subject<HTMLElement>();
        this.viewportChange$ = this.viewportChangeSubject.asObservable();
        this.defineListeners();
    }

    public changeViewport(newViewport: HTMLElement) {
        this.viewport = newViewport;
        this.viewportChangeSubject.next(newViewport);
    }

    private defineListeners() {
        this.mouseDown$ = this.viewportChange$.pipe(
            startWith(this.viewport),
            switchMap(viewport => fromEvent<MouseEvent>(viewport ?? window, 'pointerdown')),
            share(),
            takeUntilDestroyed(this.destroyRef)
        );
        this.mouseUp$ = fromEvent<MouseEvent>(window, 'pointerup').pipe(takeUntilDestroyed(this.destroyRef));
        this.mouseMove$ = fromEvent<MouseEvent>(window, 'pointermove').pipe(takeUntilDestroyed(this.destroyRef));
        this.mouseClick$ = this.mouseDown$.pipe(
            switchMap(downEvent =>
                this.mouseUp$.pipe(
                    filter(upEvent =>
                        downEvent.clientX === upEvent.clientX &&
                        downEvent.clientY === upEvent.clientY
                    )
                )
            ),
            takeUntilDestroyed(this.destroyRef)
        );
        this.mouseDrag$ = this.mouseDown$.pipe(
            switchMap(() =>
                this.mouseMove$.pipe(
                    takeUntil(this.mouseUp$)
                )
            ),
            takeUntilDestroyed(this.destroyRef)
        );
    }

    public onMouseDown(callback: (event: MouseEvent) => void): void {
        this.mouseDownSub = this.mouseDown$.subscribe(event => callback(event));
    }

    public onMouseUp(callback: (event: MouseEvent) => void): void {
        this.mouseUpSub = this.mouseUp$.subscribe(event => callback(event));
    }

    public onMouseClick(callback: (event: MouseEvent) => void): void {
        this.mouseClickSub = this.mouseClick$.subscribe(event => callback(event));
    }

    public onMouseDrag(callback: (event: MouseEvent) => void): void {
        this.mouseDragSub = this.mouseDrag$.subscribe(event => callback(event));
    }

    public stop() {
        this.mouseDownSub?.unsubscribe();
        this.mouseUpSub?.unsubscribe();
        this.mouseClickSub?.unsubscribe();
        this.mouseMoveSub?.unsubscribe();
        this.mouseDragSub?.unsubscribe();
        this.viewportChangeSubject.complete();
    }
}