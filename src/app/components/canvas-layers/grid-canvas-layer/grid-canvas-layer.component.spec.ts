import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { GridCanvasLayerComponent } from './grid-canvas-layer.component';
import { describe, beforeEach, it, expect } from 'vitest';


describe('GridCanvasLayerComponent', () => {
    let component: GridCanvasLayerComponent;
    let fixture: ComponentFixture<GridCanvasLayerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GridCanvasLayerComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(GridCanvasLayerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
