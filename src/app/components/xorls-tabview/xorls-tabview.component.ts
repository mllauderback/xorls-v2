import type { QueryList, AfterContentInit, TemplateRef, Type } from '@angular/core';
import { Component, ContentChildren, Input, ViewChild, inject, ElementRef, Output, EventEmitter } from '@angular/core';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ButtonModule } from 'primeng/button';
import { PaletteComponentSvgsComponent } from '../responsive-svgs/palette-component-svgs/palette-component-svgs.component';
import { startWith } from 'rxjs';

export interface XorlsTabModel<T = unknown> {
    id: string;
    header: string;
    component: Type<T>;
    inputs?: Record<string, unknown>

}

export interface TabChangeEvent {
    id: string;
    index: number;
}

@Component({
    selector: 'app-xorls-tab',
    template: `<ng-template #content><ng-content /></ng-template>`
})
export class DraggableTabComponent {
    @Input() id: string = crypto.randomUUID();
    @Input({ required: true }) header!: string;
    @Output() tabSelect = new EventEmitter<{ id: string, index: number }>();
    @ViewChild('content') content!: TemplateRef<unknown>;
}

@Component({
    selector: 'app-xorls-tab-view',
    imports: [CommonModule, DragDropModule, TabsModule, ButtonModule, PaletteComponentSvgsComponent],
    templateUrl: 'xorls-tabview.component.html',
    styleUrl: 'xorls-tabview.component.scss'
})
export class XorlsTabviewComponent implements AfterContentInit {
    @Input() start = 0;
    @Output() tabClose = new EventEmitter<number>();
    @Output() tabChange = new EventEmitter<TabChangeEvent>();
    @Output() tabsReordered = new EventEmitter<string[]>();

    @ContentChildren(DraggableTabComponent) tabComponents!: QueryList<DraggableTabComponent>;

    readonly icon = "pi pi-times"
    protected tabs: DraggableTabComponent[] = []
    private _activeIndex = 0;

    private el = inject(ElementRef);
    private readonly untilDestroyed = takeUntilDestroyed();

    ngAfterContentInit(): void {
        Promise.resolve().then(() => {
            this.tabComponents.changes.pipe(startWith(this.tabComponents), this.untilDestroyed).subscribe(() => this.onTabsChanged());
        });
    }

    private onTabsChanged(): void {
        const isInitialized = this.tabs.length === 0;
        this.tabs = this.tabComponents.toArray();

        if (isInitialized) {
            this.setInitialIndex(this.start);
        } else {
            if (this._activeIndex >= this.tabs.length && this._activeIndex > 0) this._activeIndex--;
            this.changeTab();
        }
    }

    public setInitialIndex(index: number) {
        this._activeIndex = index;
        this.changeTab();
    }

    public get activeIndex() {
        return this._activeIndex;
    }

    protected set activeIndex(index: number) {
        const oldIndex = this._activeIndex;
        this._activeIndex = index;
        if (oldIndex !== index) this.changeTab();
    }

    protected onDrop(event: CdkDragDrop<DraggableTabComponent[]>): void {
        if (event.previousIndex === event.currentIndex) return;

        // keep activeIndex tracking the same tab after reorder
        const activeTab = this.tabs[this.activeIndex];
        moveItemInArray(this.tabs, event.previousIndex, event.currentIndex);
        this.activeIndex = this.tabs.indexOf(activeTab);
        this.tabsReordered.emit(this.tabs.map(t => t.id));
    }

    private changeTab() {
        const tab = this.tabs[this.activeIndex];
        let id = "";
        if (tab) id = tab.id;
        const event: TabChangeEvent = {
            id,
            index: this.activeIndex
        };
        // console.log(event);
        this.tabChange.emit(event);
    }

    protected onClose(event: MouseEvent, index: number): void {
        event.stopPropagation();

        const tabElements = (this.el.nativeElement as HTMLElement).querySelectorAll('.draggable-tab-header');
        const closingTab = tabElements[index] as HTMLElement;

        const animation = closingTab.animate(
            [
                { maxWidth: `${closingTab.offsetWidth}px`, padding: getComputedStyle(closingTab).padding },
                { maxWidth: '0px', padding: '0' }
            ],
            {
                duration: 50,
                easing: 'cubic-bezier(0, 0, 0.2, 1)',
                fill: 'forwards'
            }
        );

        animation.onfinish = () => this.tabClose.emit(index);
    }
}