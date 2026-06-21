import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { ActiveComponentCanvasLayerComponent } from './active-component-canvas-layer.component';

describe('ActiveComponentCanvasLayerComponent', () => {
  let component: ActiveComponentCanvasLayerComponent;
  let fixture: ComponentFixture<ActiveComponentCanvasLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveComponentCanvasLayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveComponentCanvasLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
