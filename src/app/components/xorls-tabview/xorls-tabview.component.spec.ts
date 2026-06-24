import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { XorlsTabviewComponent, DraggableTabComponent } from './xorls-tabview.component';

@Component({
    selector: 'app-test-host',
    imports: [XorlsTabviewComponent, DraggableTabComponent],
    template: `
        <app-xorls-tab-view>
            <app-xorls-tab header="Tab One">
                <p class="tab-one-content">Tab one content</p>
            </app-xorls-tab>
            <app-xorls-tab header="Tab Two">
                <p class="tab-two-content">Tab two content</p>
            </app-xorls-tab>
            <app-xorls-tab header="Tab Three">
                <p class="tab-three-content">Tab three content</p>
            </app-xorls-tab>
        </app-xorls-tab-view>
    `
})
class TestHostComponent {}

@Component({
    selector: 'app-empty-host',
    imports: [XorlsTabviewComponent],
    template: `<app-xorls-tab-view />`
})
class EmptyHostComponent {}

const getTabviewInstance = (fixture: ComponentFixture<unknown>): XorlsTabviewComponent =>
    fixture.debugElement.query(By.directive(XorlsTabviewComponent)).componentInstance;

describe('XorlsTabviewComponent', () => {
    describe('with tabs', () => {
        let fixture: ComponentFixture<TestHostComponent>;

        beforeEach(async () => {
            await TestBed.configureTestingModule({
                imports: [TestHostComponent],
            }).compileComponents();

            fixture = TestBed.createComponent(TestHostComponent);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        afterEach(() => vi.clearAllMocks());

        describe('rendering', () => {
            it('should render a tab header for each tab', () => {
                const headers = fixture.debugElement.queryAll(By.css('.draggable-tab-header'));
                expect(headers).toHaveLength(3);
            });

            it('should render the correct header text for each tab', () => {
                const headers = fixture.debugElement.queryAll(By.css('.draggable-tab-header'));
                expect(headers[0].nativeElement.textContent).toContain('Tab One');
                expect(headers[1].nativeElement.textContent).toContain('Tab Two');
                expect(headers[2].nativeElement.textContent).toContain('Tab Three');
            });

            it('should render the first tab as active by default', () => {
                const headers = fixture.debugElement.queryAll(By.css('.draggable-tab-header'));
                expect(headers[0].nativeElement.classList).toContain('active');
            });

            it('should render the content of the active tab', () => {
                const content = fixture.debugElement.query(By.css('.tab-one-content'));
                expect(content).toBeTruthy();
                expect(content.nativeElement.textContent).toBe('Tab one content');
            });

            it('should not render content of inactive tabs', () => {
                const tabTwo = fixture.debugElement.query(By.css('.tab-two-content'));
                const tabThree = fixture.debugElement.query(By.css('.tab-three-content'));
                expect(tabTwo).toBeNull();
                expect(tabThree).toBeNull();
            });

            it('should render a close button for each tab', () => {
                const closeBtns = fixture.debugElement.queryAll(By.css('.close-btn'));
                expect(closeBtns).toHaveLength(3);
            });

            it('should not show the empty state when tabs exist', () => {
                const emptyContent = fixture.debugElement.query(By.css('.empty-content'));
                expect(emptyContent).toBeNull();
            });
        });

        describe('tab switching', () => {
            it('should set the clicked tab as active', () => {
                const headers = fixture.debugElement.queryAll(By.css('.draggable-tab-header'));
                headers[1].nativeElement.click();
                fixture.detectChanges();

                expect(headers[1].nativeElement.classList).toContain('active');
            });

            it('should deactivate the previously active tab', () => {
                const headers = fixture.debugElement.queryAll(By.css('.draggable-tab-header'));
                headers[1].nativeElement.click();
                fixture.detectChanges();

                expect(headers[0].nativeElement.classList).not.toContain('active');
            });

            it('should render the content of the newly active tab', async () => {
                const headers = fixture.debugElement.queryAll(By.css('.draggable-tab-header'));
                headers[1].nativeElement.click();
                fixture.detectChanges();
                await fixture.whenStable();

                const content = fixture.debugElement.query(By.css('.tab-two-content'));
                expect(content).toBeTruthy();
            });
        });

        describe('onDrop', () => {
            it('should reorder tabs when dropped at a new index', () => {
                const tabview = getTabviewInstance(fixture);
                const initialFirstHeader = tabview['tabs'][0].header;

                tabview['onDrop']({ previousIndex: 0, currentIndex: 1 } as CdkDragDrop<DraggableTabComponent[]>);
                fixture.detectChanges();

                expect(tabview['tabs'][1].header).toBe(initialFirstHeader);
            });

            it('should keep the active tab selected after reorder', () => {
                const tabview = getTabviewInstance(fixture);
                tabview['activeIndex'] = 0;
                const activeTab = tabview['tabs'][0];

                tabview['onDrop']({ previousIndex: 0, currentIndex: 2 } as CdkDragDrop<DraggableTabComponent[]>);
                fixture.detectChanges();

                expect(tabview['tabs'][tabview['activeIndex']]).toBe(activeTab);
            });

            it('should not reorder when previousIndex equals currentIndex', () => {
                const tabview = getTabviewInstance(fixture);
                const originalOrder = [...tabview['tabs']];

                tabview['onDrop']({ previousIndex: 1, currentIndex: 1 } as CdkDragDrop<DraggableTabComponent[]>);

                expect(tabview['tabs']).toEqual(originalOrder);
            });
        });

        describe('onClose', () => {
            beforeAll(() => {
                HTMLElement.prototype.animate = vi.fn().mockImplementation(() => {
                    const animation = { onfinish: null as (() => void) | null };
                    Promise.resolve().then(() => animation.onfinish?.());
                    return animation as unknown as Animation;
                });
            });

            it('should emit tabClose with the closed tab index', async () => {
                const tabview = getTabviewInstance(fixture);
                const emitSpy = vi.spyOn(tabview.tabClose, 'emit');

                const closeBtns = fixture.debugElement.queryAll(By.css('.close-btn'));
                closeBtns[1].nativeElement.click();
                await fixture.whenStable();

                expect(emitSpy).toHaveBeenCalledWith(1);
            });

            it('should remove the tab from the tabs array', async () => {
                const tabview = getTabviewInstance(fixture);

                const closeBtns = fixture.debugElement.queryAll(By.css('.close-btn'));
                closeBtns[0].nativeElement.click();
                await fixture.whenStable();
                fixture.detectChanges();

                expect(tabview['tabs']).toHaveLength(2);
            });

            it('should decrement activeIndex when closing a tab before the active one', async () => {
                const tabview = getTabviewInstance(fixture);
                tabview['activeIndex'] = 2;

                const closeBtns = fixture.debugElement.queryAll(By.css('.close-btn'));
                closeBtns[0].nativeElement.click();
                await fixture.whenStable();

                expect(tabview['activeIndex']).toBe(1);
            });

            it('should not decrement activeIndex below 0 when closing the only remaining tab', async () => {
                const tabview = getTabviewInstance(fixture);
                tabview['activeIndex'] = 0;

                const closeBtns = fixture.debugElement.queryAll(By.css('.close-btn'));
                closeBtns[0].nativeElement.click();
                await fixture.whenStable();

                expect(tabview['activeIndex']).toBeGreaterThanOrEqual(0);
            });

            it('should call animate on the closing tab element', () => {
                const animateSpy = vi.spyOn(HTMLElement.prototype, 'animate').mockReturnValue({
                    onfinish: null,
                } as unknown as Animation);

                const closeBtns = fixture.debugElement.queryAll(By.css('.close-btn'));
                closeBtns[0].nativeElement.click();

                expect(animateSpy).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('empty state', () => {
        let fixture: ComponentFixture<EmptyHostComponent>;

        beforeAll(async () => {
            await TestBed.configureTestingModule({
                imports: [EmptyHostComponent],
            }).compileComponents();

            fixture = TestBed.createComponent(EmptyHostComponent);
            fixture.detectChanges();
            await fixture.whenStable();
        });

        it('should show the empty state when there are no tabs', () => {
            const emptyContent = fixture.debugElement.query(By.css('.empty-content'));
            expect(emptyContent).toBeTruthy();
        });

        it('should not render the tab header list when there are no tabs', () => {
            const headerList = fixture.debugElement.query(By.css('.draggable-tab-header-list'));
            expect(headerList).toBeNull();
        });
    });
});