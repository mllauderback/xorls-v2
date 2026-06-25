import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeWorkspaceComponent } from './code-workspace.component';

describe('CodeWorkspaceComponent', () => {
  let component: CodeWorkspaceComponent;
  let fixture: ComponentFixture<CodeWorkspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeWorkspaceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
