import type { QueryList, AfterContentInit, TemplateRef, Type } from '@angular/core';
import { Component, ContentChildren, Input, ViewChild, ChangeDetectorRef, inject, ElementRef, Output, EventEmitter } from '@angular/core';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ButtonModule } from 'primeng/button';
import { PaletteComponentSvgsComponent } from '../responsive-svgs/palette-component-svgs/palette-component-svgs.component';

export interface XorlsTabModel<T = unknown> {
    id: string;
    header: string;
    component: Type<T>;
    inputs?: Record<string, unknown>;
}

export interface XorlsTabChangeEvent {
    tab: DraggableTabComponent;
    index: number;
}

@Component({
    selector: 'app-xorls-tab',
    template: `<ng-template #content><ng-content /></ng-template>`
})
export class DraggableTabComponent {
    @Input({ required: true }) header!: string;
    @Input({ required: true }) id!: string;
    @ViewChild('content') content!: TemplateRef<unknown>;
}

@Component({
    selector: 'app-xorls-tab-view',
    imports: [CommonModule, DragDropModule, TabsModule, ButtonModule, PaletteComponentSvgsComponent],
    templateUrl: 'xorls-tabview.component.html',
    styleUrl: 'xorls-tabview.component.scss'
})
export class XorlsTabviewComponent implements AfterContentInit {
    @Output() tabClose = new EventEmitter<number>();
    @Output() tabChange = new EventEmitter<XorlsTabChangeEvent>();
    @Output() tabsReordered = new EventEmitter<string[]>();

    @ContentChildren(DraggableTabComponent) tabComponents!: QueryList<DraggableTabComponent>;

    protected icon = "pi pi-times"
    protected tabs: DraggableTabComponent[] = [];
    protected _activeIndex = 0;

    private cdr = inject(ChangeDetectorRef);
    private el = inject(ElementRef);
    private readonly untilDestroyed = takeUntilDestroyed();

    public set activeIndex(index: number) {
        this._activeIndex = index;
        this.tabChange.emit({ tab: this.tabs[index], index: index });
    }

    public get activeIndex(): number {
        return this._activeIndex;
    }

    ngAfterContentInit(): void {
        Promise.resolve().then(() => {
            this.tabs = this.tabComponents.toArray();
            this.cdr.detectChanges();
        });

        this.tabComponents.changes.pipe(this.untilDestroyed).subscribe(() => {
            this.tabs = this.tabComponents.toArray();
            this.cdr.detectChanges();
        });
    }

    /**
     * Returns a copy of the tabs list in the new tab order after dropping a dragged tab.
     * Relies on the parent to modify the passed-in XorlsTabModel for changes to take effect.
     * 
     * @param event drag-drop event for tab list
     * @returns copy of the tab list in modified order
     */
    protected onDrop(event: CdkDragDrop<DraggableTabComponent[]>): void {
        if (event.previousIndex === event.currentIndex) return;

        const reorderedIds = [...this.tabs.map(t => t.id)];
        moveItemInArray(reorderedIds, event.previousIndex, event.currentIndex);
        this.tabsReordered.emit(reorderedIds);
    }

    /**
     * Returns the index of the tab being closed and triggers a closing animation.
     * Relies on the parent to modify the passed-in XorlsTabModel for changes to take effect.
     * 
     * @param event mouse event from clicking the close button
     * @param index the index of the tab being closed
     * @returns the index of the tab being closed
     */
    protected onClose(event: MouseEvent, index: number): void {
        event.stopPropagation();

        const tabElements = (this.el.nativeElement as HTMLElement).querySelectorAll('.draggable-tab-header');
        const closingTab = tabElements[index] as HTMLElement;
        if (!closingTab) return;

        const animation = closingTab.animate(
            [
                { maxWidth: `${closingTab.offsetWidth}px`, padding: getComputedStyle(closingTab).padding },
                { maxWidth: '0px', padding: '0' }
            ],
            {
                duration: 50,
                easing: 'cubic-bezier(0, 0, 0.2, 1)',
            }
        );
        animation.onfinish = () => {
            closingTab.style.maxWidth = '';
            closingTab.style.padding = '';
            this.tabClose.emit(index);
        }
    }
}