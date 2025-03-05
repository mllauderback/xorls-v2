import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftPanelPresenterComponent } from './left-panel.presenter.component';

describe('LeftPanelComponent', () => {
  let component: LeftPanelPresenterComponent;
  let fixture: ComponentFixture<LeftPanelPresenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeftPanelPresenterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeftPanelPresenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
