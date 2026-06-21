import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { RenderService } from './render.service';

describe('RenderService', () => {
    let service: RenderService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(RenderService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
