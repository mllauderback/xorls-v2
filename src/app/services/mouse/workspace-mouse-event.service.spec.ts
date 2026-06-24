import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { WorkspaceMouseEventService } from './workspace-mouse-event.service';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

describe('WorkspaceMouseEventService', () => {
    let service: WorkspaceMouseEventService;
    let store: MockStore;
    const initialState = { mouseMode: 'select', mousePosition: { x: 0, y: 0 } };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideMockStore({ initialState })
            ]
        });
        service = TestBed.inject(WorkspaceMouseEventService);
        store = TestBed.inject(MockStore);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
