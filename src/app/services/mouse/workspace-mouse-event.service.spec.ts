import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { WorkspaceMouseEventService } from './workspace-mouse-event.service';

describe('WorkspaceMouseEventService', () => {
    let service: WorkspaceMouseEventService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(WorkspaceMouseEventService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
