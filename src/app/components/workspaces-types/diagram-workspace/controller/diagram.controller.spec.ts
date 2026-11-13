import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, NgZone } from '@angular/core';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { DiagramController } from './diagram.controller';
import type { DiagramView } from './diagram-view';
import { RenderService } from '../../../../services/render/render.service';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { SelectedSelectable } from '../../../../store/components/state';
import type { PaletteComponent } from '../../../../models/components/PaletteComponent';
import type { Placeable } from '../../../../models/components/ComponentFactory';
import type { Drawable } from '../../../../models/Drawable';
import type { Point } from '../../../../models/Point';
import { AndGate, OrGate } from '../../../../models/components/gates';
import { Input as InputComponent } from '../../../../models/components/io';
import { ComponentType } from '../../../../models/components/Component';

/** Provides the controller the way the container does, so it lives and dies with its host. */
@Component({ selector: 'app-controller-host', template: '', providers: [DiagramController] })
class HostComponent { }

class MockRenderService {
    activeId = 'workspace-1';
    activeViewTransform: { origin: Point; scale: number } | null = { origin: { x: 0, y: 0 }, scale: 1 };
    panActiveDiagram = vi.fn();
}

/** Stands in for the presenter: it records what the controller asks it to show. */
class FakeView implements DiagramView {
    readonly element = document.createElement('div');
    previewed = new Set<Drawable>();
    /** Where the diagram's origin is on the screen. */
    offset: Point | null = { x: 0, y: 0 };

    clientToDiagram = vi.fn((client: Point): Point | null =>
        this.offset ? { x: client.x - this.offset.x, y: client.y - this.offset.y } : null);
    isPreviewing = vi.fn((d: Drawable) => this.previewed.has(d));
    showPreview = vi.fn((d: Drawable) => { this.previewed.add(d); });
    hidePreview = vi.fn((d: Drawable) => { this.previewed.delete(d); });
    place = vi.fn<(placed: Placeable) => void>();
    setCursor = vi.fn<(cursor: string) => void>();
}

describe('DiagramController', () => {
    let fixture: ComponentFixture<HostComponent>;
    let controller: DiagramController;
    let renderService: MockRenderService;
    let view: FakeView;

    const palette = (type: ComponentType | null): PaletteComponent | null => type ? { type, selected: true } : null;
    const select = (type: ComponentType | null) => controller.setPaletteComponent(palette(type));
    const ghost = () => controller['ghost'];

    const pointer = (type: string, x: number, y: number, init: MouseEventInit = {}) =>
        new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, ...init });
    const moveTo = (x: number, y: number, target: EventTarget = view.element) => target.dispatchEvent(pointer('pointermove', x, y));
    const click = (x: number, y: number, init: MouseEventInit = {}) => {
        view.element.dispatchEvent(pointer('pointerdown', x, y, init));
        view.element.dispatchEvent(pointer('pointerup', x, y, init));
    };
    const pressEsc = (target: EventTarget = document.body) => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        target.dispatchEvent(event);
        return event;
    };

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
    const attach = () => controller.attach(view, 'workspace-1');

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
            expect(ghost()!.position).toEqual({ x: 150, y: 50 });
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
            expect(ghost()!.position).toEqual({ x: 160, y: 80 });
        });

        it("should put the middle of the ghost's bounding box under the cursor", () => {
            select(ComponentType.AndGate); // and gate: box -20..100 x 0..80, so its middle is (40, 40) from its position

            moveTo(200, 100);

            expect(ghost()!.position).toEqual({ x: 160, y: 60 });
        });

        it('should snap the ghost to grid points', () => {
            select(ComponentType.AndGate);

            moveTo(205, 107); // wanted position is (165, 67)

            expect(ghost()!.position).toEqual({ x: 160, y: 60 });
        });

        it('should snap to the grid spacing from the workspace settings', () => {
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: 50, gridMode: 'dots' } } as WorkspaceSettingsState);
            select(ComponentType.AndGate);

            moveTo(205, 107);

            expect(ghost()!.position).toEqual({ x: 150, y: 50 });
        });

        it('should go back to the default spacing without workspace settings', () => {
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: 50, gridMode: 'dots' } } as WorkspaceSettingsState);
            controller.setWorkspaceSettings(null);
            select(ComponentType.AndGate);

            moveTo(205, 107);

            expect(ghost()!.position).toEqual({ x: 160, y: 60 });
        });

        it('should snap to multiples of the spacing in diagram coordinates, wherever the origin is', () => {
            // the grid is anchored to the diagram origin, which moves in steps of 500 as the layer grows;
            // 500 isn't a multiple of 30, so this would land off the grid if snapping depended on the origin
            controller.setWorkspaceSettings({ gridSettings: { gridSpacing: 30, gridMode: 'lines' } } as WorkspaceSettingsState);
            select(ComponentType.AndGate);

            renderService.activeViewTransform = { origin: { x: 0, y: 0 }, scale: 1 };
            moveTo(200, 100); // wanted position is (160, 60)
            const atStart = { ...ghost()!.position };

            renderService.activeViewTransform = { origin: { x: 500, y: -30 }, scale: 1 };
            moveTo(201, 100);
            moveTo(200, 100);

            expect(atStart).toEqual({ x: 150, y: 60 });
            expect(ghost()!.position).toEqual(atStart);
        });

        it('should snap positions left of and above the origin to multiples of the spacing too', () => {
            select(ComponentType.AndGate);

            moveTo(-35, -65); // wanted position is (-75, -105)

            expect(ghost()!.position).toEqual({ x: -80, y: -100 });
        });

        it('should snap a small negative position to 0, not -0', () => {
            select(ComponentType.AndGate);

            moveTo(35, 35); // wanted position is (-5, -5)

            expect(Object.is(ghost()!.position.x, 0)).toBe(true);
            expect(Object.is(ghost()!.position.y, 0)).toBe(true);
        });

        it('should use the diagram position the view works out for the pointer', () => {
            view.offset = { x: 100, y: 20 }; // the view knows where the canvas is on screen and how far it is panned
            select(ComponentType.AndGate);

            moveTo(300, 120); // 200,100 in the diagram

            expect(view.clientToDiagram).toHaveBeenCalledWith({ x: 300, y: 120 });
            expect(ghost()!.position).toEqual({ x: 160, y: 60 });
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
            expect(ghost()!.position).toEqual({ x: 160, y: 60 });
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

            expect(discarded.position).toEqual({ x: 160, y: 60 });
            expect(ghost()).toBeNull();
        });

        it('should not ask the view to do anything when only the selected component changes', () => {
            controller.setSelectedSelectable({ workspaceId: 'workspace-1', id: 'some-id', type: ComponentType.AndGate });

            expect(view.showPreview).not.toHaveBeenCalled();
            expect(view.hidePreview).not.toHaveBeenCalled();
            expect(view.place).not.toHaveBeenCalled();
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

            expect(placed.position).toEqual({ x: 160, y: 60 });
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
            expect(ghost()!.position).toEqual({ x: 160, y: 60 });
        });

        it('should place n components with n clicks', () => {
            select(ComponentType.AndGate);

            click(100, 100);
            click(200, 100);
            click(300, 100);

            expect(view.place).toHaveBeenCalledTimes(3);
            const placed = view.place.mock.calls.map(([p]) => p);
            expect(new Set(placed.map(p => p.id)).size).toBe(3);
            expect(placed.map(p => p.position.x)).toEqual([60, 160, 260]);
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

            expect(placed.position).toEqual({ x: 160, y: 60 });
            expect(ghost()!.position).toEqual({ x: 360, y: 260 });
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

            click(200, 100, { button: 2 });

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
            const handler = (e: Event) => e.preventDefault(); // a dialog or menu consuming the key before it bubbles up
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

        const fire = (target: EventTarget, type: string, x = 0, y = 0, init: MouseEventInit = {}) =>
            target.dispatchEvent(pointer(type, x, y, init));

        beforeEach(() => {
            attach();
            outside = document.createElement('div');
            document.body.append(outside);
        });

        afterEach(() => outside.remove());

        it('should pan the diagram when the workspace is dragged', () => {
            fire(view.element, 'pointerdown', 10, 10);
            fire(view.element, 'pointermove', 20, 10, { movementX: 10, movementY: 0 });

            expect(renderService.panActiveDiagram).toHaveBeenCalledOnce();
            const [dx, dy] = renderService.panActiveDiagram.mock.calls[0];
            expect(dx).toBe(10);
            expect(dy).toBe(0);
        });

        it("should give the pan the view's size, for growing the layers", () => {
            Object.defineProperty(view.element, 'clientWidth', { value: 640 });
            Object.defineProperty(view.element, 'clientHeight', { value: 480 });

            fire(view.element, 'pointerdown', 10, 10);
            fire(view.element, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram.mock.calls[0].slice(2)).toEqual([640, 480]);
        });

        it('should keep panning when the drag leaves the workspace', () => {
            fire(view.element, 'pointerdown', 10, 10);
            fire(outside, 'pointermove', 500, 500);

            expect(renderService.panActiveDiagram).toHaveBeenCalledOnce();
        });

        it('should not pan for a drag that starts elsewhere', () => {
            fire(outside, 'pointerdown', 10, 10);
            fire(outside, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it('should not pan when moving without a button held', () => {
            fire(view.element, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it('should stop panning on release', () => {
            fire(view.element, 'pointerdown', 10, 10);
            fire(view.element, 'pointerup', 10, 10);
            fire(view.element, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it('should not pan when another workspace is the one shown', () => {
            renderService.activeId = 'workspace-2';

            fire(view.element, 'pointerdown', 10, 10);
            fire(view.element, 'pointermove', 20, 10);

            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it('should show the grabbing cursor while dragging and reset it on release', () => {
            fire(view.element, 'pointerdown', 10, 10);
            fire(view.element, 'pointermove', 20, 10);
            expect(view.setCursor).toHaveBeenLastCalledWith('grabbing');

            fire(window, 'pointerup', 20, 10);
            expect(view.setCursor).toHaveBeenLastCalledWith('default');
        });

        it('should reset the cursor when the drag is released outside the workspace', () => {
            fire(view.element, 'pointerdown', 10, 10);
            fire(view.element, 'pointermove', 20, 10);

            fire(outside, 'pointerup', 500, 500);

            expect(view.setCursor).toHaveBeenLastCalledWith('default');
        });

        it('should leave the cursor alone when nothing was panned', () => {
            fire(view.element, 'pointerdown', 10, 10);
            fire(view.element, 'pointerup', 10, 10);

            expect(view.setCursor).not.toHaveBeenCalled();
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
            view.element.dispatchEvent(pointer('pointerdown', 10, 10));
            view.element.dispatchEvent(pointer('pointermove', 20, 10, { movementX: 10 }));
            pressEsc();

            expect(view.showPreview).not.toHaveBeenCalled();
            expect(view.place).not.toHaveBeenCalled();
            expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
            expect(cleared).not.toHaveBeenCalled();
        });
    });
});
