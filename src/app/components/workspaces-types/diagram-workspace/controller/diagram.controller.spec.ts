import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, NgZone } from '@angular/core';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { DiagramController } from './diagram.controller';
import { MouseButton } from '../../../../services/pointer/pointer.service';
import type { DiagramView } from './diagram-view';
import { RenderService } from '../../../../services/render/render.service';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { SelectableProperties, SelectedSelectable } from '../../../../store/components/state';
import type { PaletteComponent } from '../../../../models/components/PaletteComponent';
import type { Placeable } from '../../../../models/components/ComponentFactory';
import type { Drawable } from '../../../../models/Drawable';
import type { Point } from '../../../../models/Point';
import { AndGate, OrGate } from '../../../../models/components/gates';
import { Input as InputComponent } from '../../../../models/components/io';
import { ComponentType } from '../../../../models/components/Component';
import { GRID_SPACING } from '../../../canvas-layers/grid-canvas-layer/Grid';
import { PIXELS_PER_LINE, zoomAfterScroll } from './zoom';
import { DEFAULT_GRID_SPACING, DEFAULT_ZOOM_SETTINGS } from '../../../../store/settings/feature';
import type { ZoomSettingsState } from '../../../../store/settings/state';

/** Provides the controller the way the container does, so it lives and dies with its host. */
@Component({ selector: 'app-controller-host', template: '', providers: [DiagramController] })
class HostComponent { }

class MockRenderService {
    activeId = 'workspace-1';
    activeViewTransform: { origin: Point; scale: number; zoom: number } | null = { origin: { x: 0, y: 0 }, scale: 1, zoom: 1 };
    panActiveDiagram = vi.fn();
    zoomActiveDiagram = vi.fn<(zoom: number, anchor: Point) => void>();
    setGridScale = vi.fn<(gridScale: number) => void>();
}


class FakeView implements DiagramView {
    /** Stands in for the presenter: it records what the controller asks it to show. */
    /** Pixels per grid cell, as the real view has them with the default grid spacing and no zoom. */
    static readonly CELL = 20;
    readonly element = document.createElement('div');
    previewed = new Set<Drawable>();
    /** Where the diagram's origin is on the screen. */
    offset: Point | null = { x: 0, y: 0 };

    /** Diagram units are grid cells, CELL pixels across on the screen. */
    clientToDiagram = vi.fn((client: Point): Point | null =>
        this.offset ? { x: (client.x - this.offset.x) / FakeView.CELL, y: (client.y - this.offset.y) / FakeView.CELL } : null);
    /** The canvas is in pixels, with the diagram's origin at its top left corner: the offset on the screen. */
    clientToCanvas = vi.fn((client: Point): Point | null =>
        this.offset ? { x: client.x - this.offset.x, y: client.y - this.offset.y } : null);
    isPreviewing = vi.fn((d: Drawable) => this.previewed.has(d));
    showPreview = vi.fn((d: Drawable) => { this.previewed.add(d); });
    hidePreview = vi.fn((d: Drawable) => { this.previewed.delete(d); });
    place = vi.fn<(placed: Placeable) => void>();
    setCursor = vi.fn<(cursor: string) => void>();
    focus = vi.fn<() => void>();
}

describe('DiagramController', () => {
    let fixture: ComponentFixture<HostComponent>;
    let controller: DiagramController;
    let renderService: MockRenderService;
    let view: FakeView;

    function palette(type: ComponentType | null): PaletteComponent | null {
        return type ? { type, selected: true } : null;
    }
    function select(type: ComponentType | null) {
        controller.setPaletteComponent(palette(type));
    }
    function ghost() {
        return controller['ghost'];
    }

    function pointer(type: string, x: number, y: number, init: MouseEventInit = {}) {
        return new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, ...init });
    }
    function moveTo(x: number, y: number, target: EventTarget = view.element) {
        return target.dispatchEvent(pointer('pointermove', x, y));
    }
    function click(x: number, y: number, init: MouseEventInit = {}) {
        view.element.dispatchEvent(pointer('pointerdown', x, y, init));
        view.element.dispatchEvent(pointer('pointerup', x, y, init));
    }
    /** The bit of MouseEvent.buttons that says a button is held, by its MouseEvent.button. */
    const HELD = { [MouseButton.Left]: 1, [MouseButton.Middle]: 4, [MouseButton.Right]: 2 } as const;
    type Button = keyof typeof HELD;
    function pressButton(button: Button, x: number, y: number, target: EventTarget = view.element) {
        return target.dispatchEvent(pointer('pointerdown', x, y, { button, buttons: HELD[button] }));
    }
    function releaseButton(button: Button, x: number, y: number, target: EventTarget = view.element) {
        return target.dispatchEvent(pointer('pointerup', x, y, { button }));
    }
    function pressEsc(target: EventTarget = document.body) {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        target.dispatchEvent(event);
        return event;
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [{ provide: RenderService, useClass: MockRenderService }],
        });
        renderService = TestBed.inject(RenderService) as unknown as MockRenderService;
        fixture = TestBed.createComponent(HostComponent);
        controller = fixture.debugElement.injector.get(DiagramController);
        view = new FakeView();
        document.body.append(view.element);
    });

    afterEach(() => view.element.remove());

    /** Most tests start from a controller that is already controlling the view. */
    function attach() {
        controller.attach(view, 'workspace-1');
    }

    describe('attach', () => {
        it('should only control one view', () => {
            attach();

            expect(() => controller.attach(new FakeView(), 'workspace-2')).toThrow('already attached');
        });

        it('should apply what it was told before the view existed', () => {
            select(ComponentType.AndGate);
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: 50, gridMode: 'dots' } } as WorkspaceSettingsState);

            attach();
            moveTo(205, 107);

            expect(ghost()).toBeInstanceOf(AndGate);
            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
            expect(renderService.setGridScale).toHaveBeenCalledWith(50);
        });

        it('should not show anything until the pointer is over the workspace', () => {
            select(ComponentType.AndGate);
            attach();

            expect(view.showPreview).not.toHaveBeenCalled();
        });
    });

    describe('previewing', () => {
        beforeEach(attach);

        it('should make a ghost of the selected palette component', () => {
            select(ComponentType.AndGate);

            expect(ghost()).toBeInstanceOf(AndGate);
            expect(ghost()!.isGhost).toBe(true);
        });

        it('should give each ghost an id of its own', () => {
            select(ComponentType.AndGate);
            const first = ghost()!.id;
            select(null);
            select(ComponentType.AndGate);

            expect(first).toEqual(expect.any(String));
            expect(ghost()!.id).not.toBe(first);
        });

        it('should show the ghost once the pointer is over the workspace', () => {
            select(ComponentType.AndGate);
            expect(view.showPreview).not.toHaveBeenCalled(); // nowhere sensible to draw it yet

            moveTo(100, 100);

            expect(view.showPreview).toHaveBeenCalledWith(ghost());
        });

        it('should put the ghost at the last known pointer position when it is selected after the pointer moved', () => {
            moveTo(200, 120);

            select(ComponentType.AndGate);

            expect(view.showPreview).toHaveBeenCalledWith(ghost());
            expect(ghost()!.position).toEqual({ x: 7, y: 4 });
        });

        it("should put the middle of the ghost's bounding box under the cursor", () => {
            select(ComponentType.AndGate); // and gate: box 6 x 4 cells, so its middle is (3, 2) from its position

            moveTo(200, 100);

            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it('should keep the middle of a turned ghost under the cursor', () => {
            select(ComponentType.AndGate);
            // facing south the box is 4 x 6 cells, 1 cell right of and 1 cell above the ghost's position
            ghost()!.updateProperty('Orientation', 'South');

            moveTo(200, 100);

            expect(ghost()!.getBoundingBox()).toMatchObject({ left: 1, top: -1, width: 4, height: 6 });
            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it("should center a box that starts above the ghost's position, so the body stays under the cursor", () => {
            select(ComponentType.AndGate);
            // 16 inputs: the box is 18 cells high and starts 7 cells above the body, so its middle is still the body's
            ghost()!.updateProperty('Number of Inputs', 16);

            moveTo(200, 100);

            expect(ghost()!.getBoundingBox().top).toBe(-7);
            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it('should snap the ghost to grid points', () => {
            select(ComponentType.AndGate);

            moveTo(205, 107); // (10.25, 5.35) in the diagram, so the wanted position is (7.25, 3.35)

            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it('should scale the diagram by the grid spacing setting / GRID_SPACING: pixels per cell', () => {
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: 50, gridMode: 'dots' } } as WorkspaceSettingsState);

            expect(renderService.setGridScale).toHaveBeenCalledExactlyOnceWith(50 / GRID_SPACING);
        });

        it('should snap to GRID_SPACING in diagram units whatever the grid spacing setting', () => {
            // the setting only changes how big a cell is on screen, which the view accounts for in clientToDiagram
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: 50, gridMode: 'dots' } } as WorkspaceSettingsState);
            select(ComponentType.AndGate);

            moveTo(205, 107);

            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it('should leave the grid scale alone without a usable grid spacing', () => {
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: 50, gridMode: 'dots' } } as WorkspaceSettingsState);
            controller.setWorkspaceSettings(null);
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: 0, gridMode: 'dots' } } as WorkspaceSettingsState);
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: -20, gridMode: 'dots' } } as WorkspaceSettingsState);
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: NaN, gridMode: 'dots' } } as WorkspaceSettingsState);

            expect(renderService.setGridScale).toHaveBeenCalledExactlyOnceWith(50);
        });

        it('should snap to multiples of GRID_SPACING in diagram coordinates, wherever the origin is', () => {
            // the grid is anchored to the diagram origin, which moves in steps of 500 canvas pixels as the layer grows;
            // with 30px cells 500 isn't a multiple of a cell, so this would land off the grid if snapping depended on
            // the origin
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: 30, gridMode: 'lines' } } as WorkspaceSettingsState);
            select(ComponentType.AndGate);

            renderService.activeViewTransform = { origin: { x: 0, y: 0 }, scale: 1, zoom: 1 };
            moveTo(200, 100); // wanted position is (7, 3)
            const atStart = { ...ghost()!.position };

            renderService.activeViewTransform = { origin: { x: 500, y: -30 }, scale: 1, zoom: 1 };
            moveTo(201, 100);
            moveTo(200, 100);

            expect(atStart).toEqual({ x: 7, y: 3 });
            expect(ghost()!.position).toEqual(atStart);
        });

        it('should snap positions left of and above the origin to multiples of the spacing too', () => {
            select(ComponentType.AndGate);

            moveTo(-35, -65); // wanted position is (-4.75, -5.25)

            expect(ghost()!.position).toEqual({ x: -5, y: -5 });
        });

        it('should snap a small negative position to 0, not -0', () => {
            select(ComponentType.AndGate);

            moveTo(55, 35); // wanted position is (-0.25, -0.25)

            expect(Object.is(ghost()!.position.x, 0)).toBe(true);
            expect(Object.is(ghost()!.position.y, 0)).toBe(true);
        });

        it('should use the diagram position the view works out for the pointer', () => {
            view.offset = { x: 100, y: 20 }; // the view knows where the canvas is on screen and how far it is panned
            select(ComponentType.AndGate);

            moveTo(300, 120); // 200,100 from the diagram's origin on the screen: (10, 5) in the diagram

            expect(view.clientToDiagram).toHaveBeenCalledWith({ x: 300, y: 120 });
            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it('should not show the ghost when the view cannot place the pointer', () => {
            view.offset = null;
            select(ComponentType.AndGate);

            moveTo(200, 100);

            expect(view.showPreview).not.toHaveBeenCalled();
        });

        it('should not show the ghost again while the snapped position is unchanged', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            view.showPreview.mockClear();

            moveTo(201, 101);
            expect(view.showPreview).not.toHaveBeenCalled();

            moveTo(260, 100);
            expect(view.showPreview).toHaveBeenCalledTimes(1);
        });

        it('should make a ghost of any kind of component, such as an input', () => {
            select(ComponentType.Input);

            expect(ghost()).toBeInstanceOf(InputComponent);
        });

        it('should not make a ghost when this is not the workspace being shown', () => {
            renderService.activeId = 'another-workspace';

            select(ComponentType.AndGate);
            moveTo(100, 100);

            expect(ghost()).toBeNull();
            expect(view.showPreview).not.toHaveBeenCalled();
        });

        it('should make the ghost on the first mouse move after switching to this workspace', () => {
            renderService.activeId = 'another-workspace';
            select(ComponentType.AndGate);
            renderService.activeId = 'workspace-1'; // the user switched tabs

            moveTo(100, 100);

            expect(ghost()).toBeInstanceOf(AndGate);
            expect(view.showPreview).toHaveBeenCalledWith(ghost());
        });

        it('should ignore mouse movement outside the workspace', () => {
            select(ComponentType.AndGate);

            moveTo(100, 100, document.body);

            expect(view.showPreview).not.toHaveBeenCalled();
        });

        it('should not make a ghost while nothing is selected in the palette', () => {
            moveTo(100, 100);

            expect(ghost()).toBeNull();
            expect(view.showPreview).not.toHaveBeenCalled();
        });

        it('should replace the ghost when a different palette component is selected, at the same spot', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            const first = ghost()!;

            select(ComponentType.OrGate);

            expect(ghost()).toBeInstanceOf(OrGate);
            expect(view.hidePreview).toHaveBeenCalledWith(first);
            expect([...view.previewed]).toEqual([ghost()]);
            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it('should keep the same ghost when the palette selection is reported again unchanged', () => {
            select(ComponentType.AndGate);
            const first = ghost();

            select(ComponentType.AndGate);

            expect(ghost()).toBe(first);
        });

        it('should discard the ghost when the palette selection is cleared', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            const discarded = ghost()!;

            select(null); // what the store does after the container dispatches clearSelection

            expect(ghost()).toBeNull();
            expect(view.hidePreview).toHaveBeenCalledWith(discarded);
            expect(view.previewed.size).toBe(0);
            expect(view.place).not.toHaveBeenCalled();
        });

        it('should stop following the mouse once the ghost is discarded', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            const discarded = ghost()!;
            select(null);

            moveTo(400, 300);

            expect(discarded.position).toEqual({ x: 7, y: 3 });
            expect(ghost()).toBeNull();
        });

        it('should not ask the view to do anything when only the selected component changes', () => {
            controller.setSelectedSelectable({ workspaceId: 'workspace-1', id: 'some-id', type: ComponentType.AndGate });

            expect(view.showPreview).not.toHaveBeenCalled();
            expect(view.hidePreview).not.toHaveBeenCalled();
            expect(view.place).not.toHaveBeenCalled();
        });
    });

    describe('while a pan button is held', () => {
        let outside: HTMLElement;

        // the right button pans; the middle one does the same and is covered under 'panning'
        function press(x: number, y: number, target?: EventTarget) {
            return pressButton(MouseButton.Right, x, y, target);
        }
        function release(x: number, y: number, target?: EventTarget) {
            return releaseButton(MouseButton.Right, x, y, target);
        }

        beforeEach(() => {
            attach();
            outside = document.createElement('div');
            document.body.append(outside);
            select(ComponentType.AndGate);
            moveTo(200, 100);
        });

        afterEach(() => outside.remove());

        it('should not move the ghost when the mouse moves', () => {
            press(200, 100);

            moveTo(214, 109);
            moveTo(337, 191);

            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
            expect(view.showPreview).toHaveBeenCalledOnce();
        });

        it('should not move the ghost on the first move of a drag, before the diagram follows the mouse', () => {
            press(200, 100);

            // far enough to snap to the next grid point
            moveTo(214, 109);

            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it('should still pan the diagram', () => {
            press(200, 100);

            view.element.dispatchEvent(pointer('pointermove', 260, 100, { movementX: 60, movementY: 0 }));

            expect(renderService.panActiveDiagram).toHaveBeenCalledOnce();
            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it('should not place the component on release', () => {
            press(200, 100);
            release(200, 100);

            expect(view.place).not.toHaveBeenCalled();
            expect(ghost()!.isGhost).toBe(true);
        });

        it('should follow the mouse again once the button is released', () => {
            press(200, 100);
            moveTo(260, 140);
            release(260, 140);

            moveTo(400, 300);

            expect(ghost()!.position).toEqual({ x: 17, y: 13 });
        });

        it('should follow the mouse again when the button is released outside the workspace', () => {
            press(200, 100);
            release(900, 900, outside);

            moveTo(400, 300);

            expect(ghost()!.position).toEqual({ x: 17, y: 13 });
        });

        it('should follow the mouse again when the browser cancels the pointer', () => {
            press(200, 100);
            window.dispatchEvent(pointer('pointercancel', 200, 100));

            moveTo(400, 300);

            expect(ghost()!.position).toEqual({ x: 17, y: 13 });
        });

        it('should reset the cursor when the browser cancels the pointer during a pan', () => {
            press(200, 100);
            moveTo(260, 100);

            window.dispatchEvent(pointer('pointercancel', 260, 100));

            expect(view.setCursor).toHaveBeenLastCalledWith('default');
        });

        it('should keep following the mouse while a button pressed outside the workspace is held', () => {
            press(10, 10, outside);

            moveTo(400, 300);

            expect(ghost()!.position).toEqual({ x: 17, y: 13 });
        });

        it('should know where the pointer is after the release, for a ghost that is made then', () => {
            press(200, 100);
            moveTo(400, 300);
            release(400, 300);

            select(ComponentType.OrGate);

            expect(ghost()).toBeInstanceOf(OrGate);
            expect(ghost()!.position).toEqual({ x: 17, y: 13 });
        });
    });

    describe('while the left button is held', () => {
        function press(x: number, y: number) {
            return pressButton(MouseButton.Left, x, y);
        }
        function release(x: number, y: number) {
            return releaseButton(MouseButton.Left, x, y);
        }

        beforeEach(() => {
            attach();
            select(ComponentType.AndGate);
            moveTo(200, 100);
        });

        it('should keep the ghost following the mouse', () => {
            press(200, 100);

            moveTo(400, 300);

            expect(ghost()!.position).toEqual({ x: 17, y: 13 });
        });

        it('should not pan the diagram', () => {
            press(200, 100);

            view.element.dispatchEvent(pointer('pointermove', 260, 100, { movementX: 60, movementY: 0, buttons: 1 }));

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
            expect(view.setCursor).not.toHaveBeenCalled();
        });

        it('should not place the component when the mouse moved further than a click allows before release', () => {
            press(200, 100);
            moveTo(260, 100);
            release(260, 100);

            expect(view.place).not.toHaveBeenCalled();
            expect(ghost()!.isGhost).toBe(true);
        });

        it('should place the component where the button is released when the mouse only wobbled', () => {
            const placed = ghost()!;
            press(209, 100);
            moveTo(211, 100);
            release(211, 100);

            // 211 snaps one grid point further than where the ghost was
            expect(view.place).toHaveBeenCalledWith(placed);
            expect(placed.position).toEqual({ x: 8, y: 3 });
        });
    });

    describe('properties', () => {
        let loaded: SelectableProperties[];

        beforeEach(() => {
            attach();
            loaded = [];
            controller.propertiesLoaded$.subscribe(properties => loaded.push(properties));
        });

        /** The store holding the properties the controller reported, the way the container passes them back. */
        function storeLoaded() {
            expect(loaded).not.toHaveLength(0);
            controller.setSelectableProperties(loaded.at(-1)!);
        }
        function preview(type: ComponentType, values: SelectableProperties['values'], workspaceId = 'workspace-1'): SelectableProperties {
            return { target: { kind: 'preview', workspaceId, type }, values };
        }

        it("should report a new ghost's own properties, for this workspace's preview", () => {
            select(ComponentType.AndGate);

            expect(loaded).toEqual([preview(ComponentType.AndGate, ghost()!.properties.serialize())]);
        });

        it('should not report anything while it is not the workspace being shown', () => {
            renderService.activeId = 'workspace-2';

            select(ComponentType.AndGate);

            expect(loaded).toEqual([]);
        });

        it('should give the ghost the values edited in the store, and redraw it', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            storeLoaded();
            view.showPreview.mockClear();

            controller.setSelectableProperties(preview(ComponentType.AndGate, {
                'Number of Inputs': { value: 4, readonly: false },
                'Orientation': { value: 'South', readonly: false },
            }));

            expect(ghost()!.properties.get('Number of Inputs')?.value).toBe(4);
            expect(ghost()!.properties.get('Orientation')?.value).toBe('South');
            expect((ghost() as AndGate).inodes).toHaveLength(4);
            expect(view.showPreview).toHaveBeenCalledWith(ghost());
        });

        it('should turn a bigint held as a string back into a bigint', () => {
            select(ComponentType.Input);
            storeLoaded();

            controller.setSelectableProperties(preview(ComponentType.Input, { 'Output Value': { value: '5', readonly: false } }));

            expect(ghost()!.properties.get('Output Value')?.value).toBe(5n);
        });

        it('should not redraw when nothing changed', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            storeLoaded();
            view.showPreview.mockClear();

            storeLoaded();

            expect(view.showPreview).not.toHaveBeenCalled();
        });

        it.each([
            ['another workspace', preview(ComponentType.AndGate, { 'Number of Inputs': { value: 4, readonly: false } }, 'workspace-2')],
            ['another kind of component', preview(ComponentType.OrGate, { 'Number of Inputs': { value: 4, readonly: false } })],
            ['a placed component', {
                target: { kind: 'selected', workspaceId: 'workspace-1', id: 'gate-1', type: ComponentType.AndGate },
                values: { 'Number of Inputs': { value: 4, readonly: false } },
            } as SelectableProperties],
        ])("should leave the ghost alone for the properties of %s", (_case, properties) => {
            select(ComponentType.AndGate);

            controller.setSelectableProperties(properties);

            expect(ghost()!.properties.get('Number of Inputs')?.value).toBe(2);
        });

        it('should leave readonly properties and values the field does not accept alone', () => {
            select(ComponentType.AndGate);

            controller.setSelectableProperties(preview(ComponentType.AndGate, {
                'Output Value': { value: '1', readonly: false },
                'Number of Inputs': { value: 99, readonly: false },
            }));

            expect(ghost()!.properties.get('Output Value')?.value).toBe(0n);
            expect(ghost()!.properties.get('Number of Inputs')?.value).toBe(2);
        });

        it('should keep the edited values for the next ghost after a placement, without reporting it', () => {
            select(ComponentType.AndGate);
            controller.setSelectableProperties(preview(ComponentType.AndGate, { 'Number of Inputs': { value: 5, readonly: false } }));
            loaded = [];

            click(200, 100);

            expect(ghost()!.properties.get('Number of Inputs')?.value).toBe(5);
            expect((ghost() as AndGate).inodes).toHaveLength(5);
            expect(loaded).toEqual([]);
        });

        it('should report the defaults of a different palette component', () => {
            select(ComponentType.AndGate);
            controller.setSelectableProperties(preview(ComponentType.AndGate, { 'Number of Inputs': { value: 5, readonly: false } }));

            select(ComponentType.OrGate);

            expect(loaded.at(-1)).toEqual(preview(ComponentType.OrGate, ghost()!.properties.serialize()));
            expect(ghost()!.properties.get('Number of Inputs')?.value).toBe(2);
        });

        it('should start from the defaults again once the store drops the properties, e.g. when the palette is cleared', () => {
            select(ComponentType.AndGate);
            controller.setSelectableProperties(preview(ComponentType.AndGate, { 'Number of Inputs': { value: 5, readonly: false } }));
            select(null);
            controller.setSelectableProperties(null);
            loaded = [];

            select(ComponentType.AndGate);

            expect(ghost()!.properties.get('Number of Inputs')?.value).toBe(2);
            expect(loaded).toHaveLength(1);
        });

        it('should do nothing without a ghost', () => {
            expect(() => controller.setSelectableProperties(preview(ComponentType.AndGate, {}))).not.toThrow();
            expect(view.showPreview).not.toHaveBeenCalled();
        });
    });

    describe('clicking to place', () => {
        beforeEach(attach);

        it('should place the ghost as a regular component', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            const placed = ghost()!;

            click(200, 100);

            expect(placed.isGhost).toBe(false);
            expect(view.place).toHaveBeenCalledWith(placed);
            expect(view.previewed.has(placed)).toBe(false);
        });

        it('should hand an I/O component to the view too, which decides which layer it goes on', () => {
            select(ComponentType.Input);
            moveTo(200, 100);
            const placed = ghost()!;

            click(200, 100);

            expect(view.place).toHaveBeenCalledWith(placed);
        });

        it('should place the component where the click was, even without a mouse move first', () => {
            select(ComponentType.AndGate);
            const placed = ghost()!;

            click(200, 100);

            expect(placed.position).toEqual({ x: 7, y: 3 });
            expect(view.place).toHaveBeenCalledWith(placed);
        });

        it('should keep the id the ghost had, so the component is the same one once placed', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            const { id } = ghost()!;

            click(200, 100);

            expect(view.place).toHaveBeenCalledWith(expect.objectContaining({ id }));
        });

        it('should stop previewing the placed component before placing it', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            const placed = ghost()!;
            const order: string[] = [];
            view.hidePreview.mockImplementation(d => { if (d === placed) order.push('hide'); view.previewed.delete(d); });
            view.place.mockImplementation(() => { order.push('place'); });

            click(200, 100);

            expect(order).toEqual(['hide', 'place']);
        });

        it('should preview the palette component again, so it can be placed again', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            const placed = ghost()!;

            click(200, 100);

            expect(ghost()).toBeInstanceOf(AndGate);
            expect(ghost()).not.toBe(placed);
            expect(ghost()!.id).not.toBe(placed.id);
            expect(ghost()!.isGhost).toBe(true);
            expect([...view.previewed]).toEqual([ghost()]);
            expect(ghost()!.position).toEqual({ x: 7, y: 3 });
        });

        it('should place n components with n clicks', () => {
            select(ComponentType.AndGate);

            click(100, 100);
            click(200, 100);
            click(300, 100);

            expect(view.place).toHaveBeenCalledTimes(3);
            const placed = view.place.mock.calls.map(([p]) => p);
            expect(new Set(placed.map(p => p.id)).size).toBe(3);
            expect(placed.map(p => p.position.x)).toEqual([2, 7, 12]);
        });

        it('should keep the palette selection, so that only a cleared selection ends the placement', () => {
            const cleared = vi.fn();
            controller.selectionCleared$.subscribe(cleared);
            select(ComponentType.AndGate);

            click(200, 100);
            click(200, 100);

            expect(ghost()).not.toBeNull();
            expect(cleared).not.toHaveBeenCalled();
        });

        it('should follow the mouse with the new ghost, not the one that was placed', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            const placed = ghost()!;
            click(200, 100);

            moveTo(400, 300);

            expect(placed.position).toEqual({ x: 7, y: 3 });
            expect(ghost()!.position).toEqual({ x: 17, y: 13 });
        });

        it('should still place when the click wobbles a pixel or two', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);
            const placed = ghost()!;

            view.element.dispatchEvent(pointer('pointerdown', 200, 100));
            view.element.dispatchEvent(pointer('pointerup', 201, 101));

            expect(view.place).toHaveBeenCalledWith(placed);
        });

        it('should not place on a click while nothing is selected in the palette', () => {
            click(200, 100);

            expect(view.place).not.toHaveBeenCalled();
        });

        it('should only place with the left mouse button', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);

            click(200, 100, { button: MouseButton.Right });

            expect(ghost()!.isGhost).toBe(true);
            expect(view.place).not.toHaveBeenCalled();
        });

        it('should not treat a drag as a click', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);

            view.element.dispatchEvent(pointer('pointerdown', 200, 100));
            view.element.dispatchEvent(pointer('pointerup', 260, 100));

            expect(view.place).not.toHaveBeenCalled();
        });

        it('should ignore clicks outside the workspace, such as on the palette', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);

            document.body.dispatchEvent(pointer('pointerdown', 10, 10));
            document.body.dispatchEvent(pointer('pointerup', 10, 10));

            expect(view.place).not.toHaveBeenCalled();
        });

        it('should not place from a workspace that is not being shown', () => {
            select(ComponentType.AndGate);
            renderService.activeId = 'another-workspace';

            click(200, 100);

            expect(view.place).not.toHaveBeenCalled();
        });
    });

    describe('pressing Esc', () => {
        let cleared: ReturnType<typeof vi.fn>;
        const selection: SelectedSelectable = { workspaceId: 'workspace-1', id: 'some-id', type: ComponentType.AndGate };

        beforeEach(() => {
            attach();
            cleared = vi.fn();
            controller.selectionCleared$.subscribe(cleared);
        });

        it('should report the selection cleared when a palette component is selected', () => {
            select(ComponentType.AndGate);

            pressEsc();

            expect(cleared).toHaveBeenCalledTimes(1);
        });

        it('should report the selection cleared when a component that was already placed is selected', () => {
            controller.setSelectedSelectable(selection);

            pressEsc();

            expect(cleared).toHaveBeenCalledTimes(1);
        });

        it('should not report it again once the selection is gone', () => {
            controller.setSelectedSelectable(selection);
            controller.setSelectedSelectable(null);

            pressEsc();

            expect(cleared).not.toHaveBeenCalled();
        });

        it('should clear a placement that was never finished, with focus still on the palette checkbox that was clicked', () => {
            // palette items are checkboxes, and clicking one leaves focus on it
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            document.body.append(checkbox);
            select(ComponentType.AndGate);
            moveTo(200, 100); // moved around, never placed

            pressEsc(checkbox);

            expect(cleared).toHaveBeenCalledTimes(1);
            checkbox.remove();
        });

        it('should clear the placement even before the ghost exists, such as right after switching tabs', () => {
            renderService.activeId = 'another-workspace';
            select(ComponentType.AndGate);
            renderService.activeId = 'workspace-1';

            pressEsc();

            expect(ghost()).toBeNull();
            expect(cleared).toHaveBeenCalledTimes(1);
        });

        it('should use the key, so the browser and lower priority handlers leave it alone', () => {
            select(ComponentType.AndGate);

            expect(pressEsc().defaultPrevented).toBe(true);
        });

        it('should not use the key when nothing is selected, so something else can', () => {
            const event = pressEsc();

            expect(cleared).not.toHaveBeenCalled();
            expect(event.defaultPrevented).toBe(false);
        });

        it('should report inside the Angular zone, since it leads to a store update', () => {
            let inZone: boolean | undefined;
            controller.selectionCleared$.subscribe(() => { inZone = NgZone.isInAngularZone(); });
            select(ComponentType.AndGate);

            pressEsc();

            expect(inZone).toBe(true);
        });

        it('should not clear anything itself, which is up to whoever owns the selection', () => {
            select(ComponentType.AndGate);
            moveTo(200, 100);

            pressEsc();

            expect(ghost()).not.toBeNull();
            expect(view.hidePreview).not.toHaveBeenCalled();
        });

        it('should ignore other keys', () => {
            select(ComponentType.AndGate);

            document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

            expect(cleared).not.toHaveBeenCalled();
        });

        it('should ignore Esc when this is not the workspace being shown', () => {
            select(ComponentType.AndGate); // so it is only the rule under test that stops it
            renderService.activeId = 'another-workspace';

            pressEsc();

            expect(cleared).not.toHaveBeenCalled();
        });

        it.each(['input', 'textarea', 'select'])('should ignore Esc typed into a %s', (tag) => {
            select(ComponentType.AndGate); // so it is only the rule under test that stops it
            const field = document.createElement(tag);
            document.body.appendChild(field);

            pressEsc(field);

            expect(cleared).not.toHaveBeenCalled();
            field.remove();
        });

        it('should ignore Esc that something else already handled', () => {
            select(ComponentType.AndGate); // so it is only the rule under test that stops it
            function handler(e: Event) {
                e.preventDefault();
            } // a dialog or menu consuming the key before it bubbles up
            window.addEventListener('keydown', handler, true);

            pressEsc();

            expect(cleared).not.toHaveBeenCalled();
            window.removeEventListener('keydown', handler, true);
        });

        it('should leave components that were already placed on the diagram', () => {
            select(ComponentType.AndGate);
            click(200, 100);
            const placed = view.place.mock.calls[0][0];
            view.hidePreview.mockClear();

            select(null);

            // only the ghost that replaced it goes, not the component that was placed
            expect(view.hidePreview).toHaveBeenCalledOnce();
            expect(view.hidePreview).not.toHaveBeenCalledWith(placed);
        });
    });

    describe('panning', () => {
        let outside: HTMLElement;

        function fire(target: EventTarget, type: string, x = 0, y = 0, init: MouseEventInit = {}) {
            return target.dispatchEvent(pointer(type, x, y, init));
        }
        /** Presses the right button, which pans. */
        function pressPan(target: EventTarget, x: number, y: number) {
            return pressButton(MouseButton.Right, x, y, target);
        }

        beforeEach(() => {
            attach();
            outside = document.createElement('div');
            document.body.append(outside);
        });

        afterEach(() => outside.remove());

        for (const [name, button] of [['right', MouseButton.Right], ['middle', MouseButton.Middle]] as const) {
            it(`should pan the diagram when the workspace is dragged with the ${name} button`, () => {
                pressButton(button, 10, 10);
                fire(view.element, 'pointermove', 20, 10, { movementX: 10, movementY: 0, buttons: HELD[button] });

                expect(renderService.panActiveDiagram).toHaveBeenCalledOnce();
                const [dx, dy] = renderService.panActiveDiagram.mock.calls[0];
                expect(dx).toBe(10);
                expect(dy).toBe(0);
            });
        }

        it('should not pan when the workspace is dragged with the left button, which places and selects', () => {
            pressButton(MouseButton.Left, 10, 10);
            fire(view.element, 'pointermove', 20, 10, { movementX: 10, movementY: 0, buttons: 1 });

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
            expect(view.setCursor).not.toHaveBeenCalled();
        });

        it('should not pan with a left drag that follows a pan', () => {
            pressPan(view.element, 10, 10);
            releaseButton(MouseButton.Right, 10, 10, window);
            pressButton(MouseButton.Left, 10, 10);
            fire(view.element, 'pointermove', 20, 10, { movementX: 10, buttons: 1 });

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it("should give the pan the view's size, for growing the layers", () => {
            Object.defineProperty(view.element, 'clientWidth', { value: 640 });
            Object.defineProperty(view.element, 'clientHeight', { value: 480 });

            pressPan(view.element, 10, 10);
            fire(view.element, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram.mock.calls[0].slice(2)).toEqual([640, 480]);
        });

        it('should keep panning when the drag leaves the workspace', () => {
            pressPan(view.element, 10, 10);
            fire(outside, 'pointermove', 500, 500);

            expect(renderService.panActiveDiagram).toHaveBeenCalledOnce();
        });

        it('should not pan for a drag that starts elsewhere', () => {
            pressPan(outside, 10, 10);
            fire(outside, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it('should not pan when moving without a button held', () => {
            fire(view.element, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it('should stop panning on release', () => {
            pressPan(view.element, 10, 10);
            fire(view.element, 'pointerup', 10, 10);
            fire(view.element, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it('should not pan when another workspace is the one shown', () => {
            renderService.activeId = 'workspace-2';

            pressPan(view.element, 10, 10);
            fire(view.element, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it('should show the grabbing cursor while dragging and reset it on release', () => {
            pressPan(view.element, 10, 10);
            fire(view.element, 'pointermove', 20, 10);
            expect(view.setCursor).toHaveBeenLastCalledWith('grabbing');

            fire(window, 'pointerup', 20, 10);
            expect(view.setCursor).toHaveBeenLastCalledWith('default');
        });

        it('should set the grabbing cursor once for a pan, however far it is dragged', () => {
            pressPan(view.element, 10, 10);
            fire(view.element, 'pointermove', 20, 10);
            fire(view.element, 'pointermove', 30, 10);
            fire(view.element, 'pointermove', 40, 10);

            expect(renderService.panActiveDiagram).toHaveBeenCalledTimes(3);
            expect(view.setCursor).toHaveBeenCalledOnce();
        });

        it('should reset the cursor when the drag is released outside the workspace', () => {
            pressPan(view.element, 10, 10);
            fire(view.element, 'pointermove', 20, 10);

            fire(outside, 'pointerup', 500, 500);

            expect(view.setCursor).toHaveBeenLastCalledWith('default');
        });

        it('should leave the cursor alone when nothing was panned', () => {
            pressPan(view.element, 10, 10);
            fire(view.element, 'pointerup', 10, 10);

            expect(view.setCursor).not.toHaveBeenCalled();
        });
    });

    describe('keyboard focus', () => {
        function enter() {
            view.element.dispatchEvent(new PointerEvent('pointerenter', { clientX: 200, clientY: 100 }));
        }

        beforeEach(() => attach());

        it('should give the view the focus when the pointer comes over the diagram', () => {
            enter();

            expect(view.focus).toHaveBeenCalledOnce();
        });

        it('should give it the focus every time the pointer comes back', () => {
            enter();
            enter();

            expect(view.focus).toHaveBeenCalledTimes(2);
        });

        it('should take the focus from a button, so Escape reaches the diagram again', () => {
            const button = document.createElement('button');
            document.body.append(button);
            button.focus();

            enter();

            expect(view.focus).toHaveBeenCalledOnce();
            button.remove();
        });

        it.each([
            ['a text input', () => Object.assign(document.createElement('input'), { type: 'text' })],
            ['a number input', () => Object.assign(document.createElement('input'), { type: 'number' })],
            ['a textarea', () => document.createElement('textarea')],
        ])('should leave the focus in %s, which is being typed in', (_, create) => {
            const field = create();
            document.body.append(field);
            field.focus();

            enter();

            expect(view.focus).not.toHaveBeenCalled();
            expect(document.activeElement).toBe(field);
            field.remove();
        });

        it('should take the focus from a checkbox, which is not typed in', () => {
            const checkbox = Object.assign(document.createElement('input'), { type: 'checkbox' });
            document.body.append(checkbox);
            checkbox.focus();

            enter();

            expect(view.focus).toHaveBeenCalledOnce();
            checkbox.remove();
        });

        it('should not take the focus for a workspace that is not shown', () => {
            renderService.activeId = 'workspace-2';

            enter();

            expect(view.focus).not.toHaveBeenCalled();
        });

        it('should let Escape clear the selection once the pointer is back, after a tab that stops keys had the focus', () => {
            // a tab like PrimeNG's: it keeps every key it gets from reaching the window
            const tab = document.createElement('div');
            tab.tabIndex = 0;
            tab.addEventListener('keydown', event => event.stopPropagation());
            document.body.append(tab);
            view.focus.mockImplementation(() => {
                view.element.tabIndex = -1;
                view.element.focus();
            });
            document.body.append(view.element);
            select(ComponentType.AndGate);
            moveTo(200, 100);
            let cleared = 0;
            controller.selectionCleared$.subscribe(() => cleared++);
            tab.focus();
            tab.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            expect(cleared).toBe(0); // the tab kept it

            enter();
            document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

            expect(document.activeElement).toBe(view.element);
            expect(cleared).toBe(1);
            tab.remove();
            view.element.remove();
        });
    });

    describe('zooming', () => {
        /** Where the pointer is in most of these tests. The diagram is at the screen's top left, so it is this on the canvas too. */
        const POINTER: Point = { x: 200, y: 100 };
        /** How far one mouse wheel notch scrolls in Chrome and Safari, in pixels. */
        const NOTCH = 100;
        /** How many lines one mouse wheel notch scrolls in Firefox. */
        const NOTCH_LINES = 3;
        /** How far a small trackpad pinch scrolls, in pixels: browsers report a pinch as a scroll with ctrl held. */
        const PINCH = 2;
        /** Far enough to scroll past any zoom limit. */
        const FAR = 100_000;
        /** Scrolling up is negative, and zooms in; spreading two fingers is a scroll up. Scrolling down is positive. */
        const UP = -1;
        const DOWN = 1;

        function scroll(at: Point, deltaY: number, init: WheelEventInit = {}, target: EventTarget = view.element) {
            const event = new WheelEvent('wheel', { clientX: at.x, clientY: at.y, deltaY, bubbles: true, cancelable: true, ...init });
            target.dispatchEvent(event);
            return event;
        }

        /** What the controller should zoom to for a scroll in pixels, from the zoom the render service has now. */
        function zoomedBy(deltaY: number, settings: ZoomSettingsState, { pinch = false } = {}) {
            const scrolled = { deltaY, deltaMode: WheelEvent.DOM_DELTA_PIXEL, ctrlKey: pinch };
            return zoomAfterScroll(renderService.activeViewTransform!.zoom, scrolled, settings, view.element.clientHeight);
        }

        beforeEach(() => attach());

        it('should zoom around the canvas point under the pointer', () => {
            const expected = zoomedBy(UP * NOTCH, DEFAULT_ZOOM_SETTINGS);

            scroll(POINTER, UP * NOTCH);

            expect(expected).toBeGreaterThan(renderService.activeViewTransform!.zoom);
            expect(renderService.zoomActiveDiagram).toHaveBeenCalledExactlyOnceWith(expected, POINTER);
        });

        it('should give the canvas point, not the screen point: it allows for where the diagram is on the screen', () => {
            const diagramOnScreen = { x: 100, y: 20 };
            view.offset = diagramOnScreen;

            scroll({ x: POINTER.x + diagramOnScreen.x, y: POINTER.y + diagramOnScreen.y }, UP * NOTCH);

            expect(renderService.zoomActiveDiagram.mock.calls[0][1]).toEqual(POINTER);
        });

        it('should give exactly the same canvas point for every scroll with the pointer held still', () => {
            const offTheGrid = { x: 237, y: 151 };

            scroll(offTheGrid, UP * NOTCH);
            scroll(offTheGrid, UP * NOTCH);
            scroll(offTheGrid, DOWN * NOTCH);

            const [first, ...rest] = renderService.zoomActiveDiagram.mock.calls.map(([, at]) => at);
            for (const at of rest) {
                expect(at.x).toBe(first.x);
                expect(at.y).toBe(first.y);
            }
        });

        it('should zoom from the current zoom', () => {
            const zoomedIn = 2;
            renderService.activeViewTransform!.zoom = zoomedIn;
            const expected = zoomedBy(DOWN * NOTCH, DEFAULT_ZOOM_SETTINGS);

            scroll(POINTER, DOWN * NOTCH);

            expect(expected).toBeLessThan(zoomedIn);
            expect(renderService.zoomActiveDiagram).toHaveBeenCalledWith(expected, POINTER);
        });

        it('should zoom a pinch at the pinch rate', () => {
            const expected = zoomedBy(UP * PINCH, DEFAULT_ZOOM_SETTINGS, { pinch: true });

            scroll(POINTER, UP * PINCH, { ctrlKey: true });

            expect(renderService.zoomActiveDiagram).toHaveBeenCalledWith(expected, POINTER);
        });

        it('should keep a scroll over the diagram from scrolling the page', () => {
            expect(scroll(POINTER, DOWN * NOTCH).defaultPrevented).toBe(true);
        });

        it('should keep the page from scrolling even when the zoom is at its limit', () => {
            renderService.activeViewTransform!.zoom = DEFAULT_ZOOM_SETTINGS.maxZoom;

            const event = scroll(POINTER, UP * NOTCH);

            expect(event.defaultPrevented).toBe(true);
            expect(renderService.zoomActiveDiagram).toHaveBeenCalledWith(DEFAULT_ZOOM_SETTINGS.maxZoom, POINTER);
        });

        it('should leave scrolls anywhere else alone', () => {
            const elsewhere = document.createElement('div');
            document.body.append(elsewhere);

            const event = scroll(POINTER, DOWN * NOTCH, {}, elsewhere);

            expect(event.defaultPrevented).toBe(false);
            expect(renderService.zoomActiveDiagram).not.toHaveBeenCalled();
            elsewhere.remove();
        });

        it('should not zoom a workspace that is not shown', () => {
            renderService.activeId = 'workspace-2';

            scroll(POINTER, DOWN * NOTCH);

            expect(renderService.zoomActiveDiagram).not.toHaveBeenCalled();
        });

        it('should not zoom while the view cannot tell where the pointer is on the diagram', () => {
            view.offset = null;

            scroll(POINTER, DOWN * NOTCH);

            expect(renderService.zoomActiveDiagram).not.toHaveBeenCalled();
        });

        describe('with the zoom settings', () => {
            function settings(zoomSettings: Partial<Record<keyof ZoomSettingsState, unknown>>, gridSpacing = DEFAULT_GRID_SPACING) {
                return {
                    gridSettings: { gridSpacing, gridMode: 'dots' },
                    zoomSettings: { ...DEFAULT_ZOOM_SETTINGS, ...zoomSettings },
                } as WorkspaceSettingsState;
            }
            /** Faster than the defaults, with narrower limits: still wide enough that one notch up isn't stopped by them. */
            const custom: ZoomSettingsState = {
                scrollRate: 0.004, pinchRate: 0.05, minZoom: 0.5, maxZoom: 2, invertScroll: false,
            };
            /** One notch up at the custom scroll speed, from no zoom: e^(NOTCH × scrollRate). */
            const oneNotchUp = Math.exp(NOTCH * custom.scrollRate);

            it('should have custom limits that don\'t stop one notch up', () => {
                expect(oneNotchUp).toBeLessThan(custom.maxZoom);
            });

            it('should zoom at the speed the settings say', () => {
                controller.setWorkspaceSettings(settings(custom));
                const expected = zoomedBy(UP * NOTCH, custom);

                scroll(POINTER, UP * NOTCH);

                expect(expected).toBeCloseTo(oneNotchUp);
                expect(renderService.zoomActiveDiagram).toHaveBeenCalledWith(expected, POINTER);
            });

            it('should zoom a pinch at the pinch speed and scroll by lines at the scroll speed', () => {
                controller.setWorkspaceSettings(settings(custom));

                scroll(POINTER, UP * PINCH, { ctrlKey: true });
                scroll(POINTER, UP * NOTCH_LINES, { deltaMode: WheelEvent.DOM_DELTA_LINE });

                const [[pinch], [lines]] = renderService.zoomActiveDiagram.mock.calls;
                expect(pinch).toBeCloseTo(Math.exp(PINCH * custom.pinchRate));
                expect(lines).toBeCloseTo(Math.exp(NOTCH_LINES * PIXELS_PER_LINE * custom.scrollRate));
            });

            it('should zoom out scrolling up when the settings invert scrolling, and keep pinches as they are', () => {
                controller.setWorkspaceSettings(settings({ ...custom, invertScroll: true }));

                scroll(POINTER, UP * NOTCH);
                scroll(POINTER, UP * PINCH, { ctrlKey: true });

                const [[scrolled], [pinched]] = renderService.zoomActiveDiagram.mock.calls;
                expect(scrolled).toBeCloseTo(1 / oneNotchUp);
                expect(pinched).toBeCloseTo(Math.exp(PINCH * custom.pinchRate));
            });

            it('should stop at the limits the settings say', () => {
                controller.setWorkspaceSettings(settings(custom));

                scroll(POINTER, UP * FAR);
                scroll(POINTER, DOWN * FAR);

                expect(renderService.zoomActiveDiagram.mock.calls.map(([zoom]) => zoom)).toEqual([custom.maxZoom, custom.minZoom]);
            });

            it('should use settings it was told before the view existed', () => {
                fixture.destroy();
                fixture = TestBed.createComponent(HostComponent);
                controller = fixture.debugElement.injector.get(DiagramController);
                controller.setWorkspaceSettings(settings(custom));
                controller.attach(view, 'workspace-1');

                scroll(POINTER, UP * NOTCH);

                expect(renderService.zoomActiveDiagram).toHaveBeenCalledWith(zoomedBy(UP * NOTCH, custom), POINTER);
            });

            it('should keep the last usable setting for one that is empty or invalid, as a field being edited can be', () => {
                const unusable = { scrollRate: null, maxZoom: -1 };
                controller.setWorkspaceSettings(settings(custom));
                controller.setWorkspaceSettings(settings({ ...custom, ...unusable }));

                scroll(POINTER, UP * NOTCH);

                expect(renderService.zoomActiveDiagram).toHaveBeenCalledWith(zoomedBy(UP * NOTCH, custom), POINTER);
            });

            it('should take the zoom settings even when the grid spacing is invalid', () => {
                const invalidSpacing = 0;
                controller.setWorkspaceSettings(settings(custom, invalidSpacing));

                scroll(POINTER, UP * NOTCH);

                expect(renderService.setGridScale).not.toHaveBeenCalled();
                expect(renderService.zoomActiveDiagram.mock.calls[0][0]).toBeCloseTo(oneNotchUp);
            });

            it('should keep zooming with the settings it has when it is told about none', () => {
                controller.setWorkspaceSettings(settings(custom));
                controller.setWorkspaceSettings(null);

                scroll(POINTER, UP * NOTCH);

                expect(renderService.zoomActiveDiagram.mock.calls[0][0]).toBeCloseTo(oneNotchUp);
            });
        });

        it('should keep the ghost under the pointer, snapped to the grid at the new zoom', () => {
            // under the pointer is (10, 5) in cells; the AND gate is 6 x 4 cells, so it is placed half that up and left
            const snapped = { x: 7, y: 3 };
            // zooming moves the diagram this many cells left under the pointer
            const moved = 2;
            select(ComponentType.AndGate);
            moveTo(POINTER.x, POINTER.y);
            expect(ghost()!.position).toEqual(snapped);
            renderService.zoomActiveDiagram.mockImplementation(() => { view.offset = { x: -moved * FakeView.CELL, y: 0 }; });

            scroll(POINTER, UP * NOTCH);

            expect(ghost()!.position).toEqual({ x: snapped.x + moved, y: snapped.y });
        });
    });

    describe('when destroyed', () => {
        it('should stop reacting to the pointer and the keyboard', () => {
            attach();
            const cleared = vi.fn();
            controller.selectionCleared$.subscribe(cleared);
            select(ComponentType.AndGate);
            fixture.destroy();
            view.showPreview.mockClear();

            moveTo(200, 100);
            click(200, 100);
            pressButton(MouseButton.Right, 10, 10);
            view.element.dispatchEvent(pointer('pointermove', 20, 10, { movementX: 10, buttons: 2 }));
            pressEsc();

            expect(view.showPreview).not.toHaveBeenCalled();
            expect(view.place).not.toHaveBeenCalled();
            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
            expect(cleared).not.toHaveBeenCalled();
        });
    });
});
