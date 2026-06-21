import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { ProjectTreeComponent } from './project-tree.component';

describe('ProjectTreeComponent', () => {
    let component: ProjectTreeComponent;
    let fixture: ComponentFixture<ProjectTreeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ProjectTreeComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(ProjectTreeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
