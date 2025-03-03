import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridSelectionPanelPresenterComponent } from './grid-selection-panel.presenter.component';

describe('GridSelectionPanelPresenterComponent', () => {
  let component: GridSelectionPanelPresenterComponent;
  let fixture: ComponentFixture<GridSelectionPanelPresenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridSelectionPanelPresenterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridSelectionPanelPresenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
