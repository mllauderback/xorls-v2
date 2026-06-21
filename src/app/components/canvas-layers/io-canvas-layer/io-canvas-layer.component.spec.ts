import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { IOCanvasLayerComponent } from './io-canvas-layer.component';

describe('IOCanvasLayerComponent', () => {
  let component: IOCanvasLayerComponent;
  let fixture: ComponentFixture<IOCanvasLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IOCanvasLayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IOCanvasLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
