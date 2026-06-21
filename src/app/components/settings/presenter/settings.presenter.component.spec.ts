import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { SettingsPresenterComponent } from './settings.presenter.component';

describe('SettingsComponent', () => {
    let component: SettingsPresenterComponent;
    let fixture: ComponentFixture<SettingsPresenterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SettingsPresenterComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(SettingsPresenterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
