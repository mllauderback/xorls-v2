import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { AbstractCanvasLayerComponent } from './abstract-canvas-layer.component';

describe('AbstractCanvasLayerComponent', () => {
  let component: AbstractCanvasLayerComponent;
  let fixture: ComponentFixture<AbstractCanvasLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbstractCanvasLayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbstractCanvasLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
