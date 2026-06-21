import { Injectable } from '@angular/core';
import { filter, fromEvent, Observable, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { MouseEventHandler } from '../../models/MouseEventHandler';
import { Store } from '@ngrx/store';
import { WorkspaceState } from '../../store/workspace/state';
import * as actions from '../../store/workspace/actions';

@Injectable({
    providedIn: 'root'
})
export class WorkspaceMouseEventService {
    private destroy$ = new Subject<void>();

    // we want the application to crash if mouse events down work
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
    
    private workspaceViewport?: HTMLElement;

    private handlers: Map<string, MouseEventHandler> = new Map();

    constructor(private store: Store<WorkspaceState>) {}

    /**
     * Sets the viewport to listen to and initializes observables.
     */
    public defineViewport(viewport: HTMLElement) {
        this.workspaceViewport = viewport;

        this.mouseDown$ = fromEvent<MouseEvent>(this.workspaceViewport, 'pointerdown').pipe(
            takeUntil(this.destroy$)
        );
        this.mouseUp$ = fromEvent<MouseEvent>(window, 'pointerup').pipe(
            takeUntil(this.destroy$)
        );
        this.mouseMove$ = fromEvent<MouseEvent>(window, 'pointermove').pipe(
            takeUntil(this.destroy$)
        );
        this.mouseClick$ = this.mouseDown$.pipe(
            switchMap(downEvent =>
                this.mouseUp$.pipe(
                    filter(upEvent =>
                        downEvent.clientX === upEvent.clientX &&
                        downEvent.clientY === upEvent.clientY
                    )
                )
            ),
            takeUntil(this.destroy$)
        );
        this.mouseDrag$ = this.mouseDown$.pipe(
            switchMap(() =>
                this.mouseMove$.pipe(
                    takeUntil(this.mouseUp$)
                )
            ),
            takeUntil(this.destroy$)
        );
    }

    public listen() {
        this.mouseDownSub = this.mouseDown$.subscribe(event => {
            let data;
            if (event.button === 1 || event.button === 2) { // right or middle click
                this.store.dispatch(actions.updateMouseMode({ mode: 'pan' }));
            } else {
                this.store.dispatch(actions.updateMouseMode({ mode: 'select' }));
            }
            const targetedHandler = [...this.handlers.values()]
                .reverse()
                .find(handler => (data = handler.selectOnEvent(event)) !== null);
            targetedHandler?.onMouseDown(event, data);
        });
        
        this.mouseUpSub = this.mouseUp$.subscribe(event => {
            let data;
            this.store.dispatch(actions.updateMouseMode({ mode: 'select' }));
            const targetedHandler = [...this.handlers.values()]
                .reverse()
                .find(handler => (data = handler.selectOnEvent(event)) !== null);
            targetedHandler?.onMouseUp(event, data);
        });
        
        this.mouseClickSub = this.mouseClick$.subscribe(event => {
            let data;
            const targetedHandler = [...this.handlers.values()]
                .reverse()
                .find(handler => (data = handler.selectOnEvent(event)) !== null);
            targetedHandler?.onMouseClick(event, data);
        });
        
        this.mouseMoveSub = this.mouseMove$.subscribe(event => {
            let data;
            const targetedHandler = [...this.handlers.values()]
                .reverse()
                .find(handler => (data = handler.selectOnEvent(event)) !== null);
            targetedHandler?.onMouseMove(event, data);
        });
        
        this.mouseDragSub = this.mouseDrag$.subscribe(event => {
            let data;
            const targetedHandler = [...this.handlers.values()]
                .reverse()
                .find(handler => (data = handler.selectOnEvent(event)) !== null);
            targetedHandler?.onMouseDrag(event, data);
        });
    }

    public registerHandler(id: string, handler: MouseEventHandler): WorkspaceMouseEventService {
        this.handlers.set(id, handler);
        return this;
    }

    public unregisterHandler(id: string): WorkspaceMouseEventService {
        this.handlers.delete(id);
        return this;
    }

    destroy() {
        this.destroy$.next();
        this.destroy$.complete();
        this.mouseDownSub?.unsubscribe();
        this.mouseUpSub?.unsubscribe();
        this.mouseClickSub?.unsubscribe();
        this.mouseMoveSub?.unsubscribe();
        this.mouseDragSub?.unsubscribe();
        this.handlers.clear();
    }
}
