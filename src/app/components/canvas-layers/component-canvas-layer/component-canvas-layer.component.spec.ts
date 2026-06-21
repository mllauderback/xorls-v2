import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { ComponentCanvasLayerComponent } from './component-canvas-layer.component';

describe('ComponentCanvasLayerComponent', () => {
  let component: ComponentCanvasLayerComponent;
  let fixture: ComponentFixture<ComponentCanvasLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentCanvasLayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComponentCanvasLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
