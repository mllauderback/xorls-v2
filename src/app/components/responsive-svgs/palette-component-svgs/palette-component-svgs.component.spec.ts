import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaletteComponentSvgsComponent } from './palette-component-svgs.component';

describe('PaletteComponentSvgsComponent', () => {
  let component: PaletteComponentSvgsComponent;
  let fixture: ComponentFixture<PaletteComponentSvgsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaletteComponentSvgsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaletteComponentSvgsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
