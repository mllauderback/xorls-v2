import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentPalettePresenterComponent } from './component-palette.presenter.component';

describe('ComponentPalettePresenterComponent', () => {
  let component: ComponentPalettePresenterComponent;
  let fixture: ComponentFixture<ComponentPalettePresenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentPalettePresenterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponentPalettePresenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
