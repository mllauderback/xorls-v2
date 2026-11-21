import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { StatusbarComponent } from './statusbar.component';

describe('StatusbarComponent', () => {
    let component: StatusbarComponent;
    let fixture: ComponentFixture<StatusbarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StatusbarComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(StatusbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
