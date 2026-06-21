import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveWireCanvasLayerComponent } from './active-wire-canvas-layer.component';

describe('ActiveWireCanvasLayerComponent', () => {
  let component: ActiveWireCanvasLayerComponent;
  let fixture: ComponentFixture<ActiveWireCanvasLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveWireCanvasLayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveWireCanvasLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
