import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { WireCanvasLayerComponent } from './wire-canvas-layer.component';

describe('WireCanvasLayerComponent', () => {
    let component: WireCanvasLayerComponent;
    let fixture: ComponentFixture<WireCanvasLayerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WireCanvasLayerComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(WireCanvasLayerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
