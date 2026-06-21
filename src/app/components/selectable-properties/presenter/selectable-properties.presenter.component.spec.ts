import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { SelectablePropertiesPresenterComponent } from './selectable-properties.presenter.component';

describe('SelectablePropertiesComponent', () => {
    let component: SelectablePropertiesPresenterComponent;
    let fixture: ComponentFixture<SelectablePropertiesPresenterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SelectablePropertiesPresenterComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(SelectablePropertiesPresenterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
