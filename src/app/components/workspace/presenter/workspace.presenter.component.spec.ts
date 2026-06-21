import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { WorkspacePresenterComponent } from './workspace.presenter.component';

describe('WorkspacePresenterComponent', () => {
    let component: WorkspacePresenterComponent;
    let fixture: ComponentFixture<WorkspacePresenterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WorkspacePresenterComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(WorkspacePresenterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
