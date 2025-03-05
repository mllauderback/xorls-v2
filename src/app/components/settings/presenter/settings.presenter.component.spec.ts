import { ComponentFixture, TestBed } from '@angular/core/testing';

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
