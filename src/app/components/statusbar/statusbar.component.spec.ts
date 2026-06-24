import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { StatusbarComponent } from './statusbar.component';
import { By } from '@angular/platform-browser';

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

    it('should have message "Statusbar works!"', () => {
        expect(component.message).toBe("Statusbar works!");
    });

    it('should render message in a p element', () => {
        const messageEl = fixture.debugElement.query(By.css('p')).nativeElement;
        expect(messageEl.textContent).toBe(component.message);
    });
});
