import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiagramWorkspaceComponent } from './diagram-workspace.presenter.component';
import { beforeEach, describe, expect, it } from 'vitest';

describe('DiagramWorkspaceComponent', () => {
  let component: DiagramWorkspaceComponent;
  let fixture: ComponentFixture<DiagramWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramWorkspaceComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DiagramWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
