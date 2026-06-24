import type { QueryList, AfterContentInit, TemplateRef} from '@angular/core';
import { Component, ContentChildren, Input, ViewChild, ChangeDetectorRef, inject, ElementRef, Output, EventEmitter } from '@angular/core';
import type { CdkDragDrop} from '@angular/cdk/drag-drop';
import { DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ButtonModule } from 'primeng/button';
import { PaletteComponentSvgsComponent } from '../responsive-svgs/palette-component-svgs/palette-component-svgs.component';

@Component({
    selector: 'app-xorls-tab',
    template: `<ng-template #content><ng-content /></ng-template>`
})
export class DraggableTabComponent {
    @Input({ required: true }) header!: string;
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

    @ContentChildren(DraggableTabComponent) tabComponents!: QueryList<DraggableTabComponent>;

    icon = "pi pi-times"
    protected tabs: DraggableTabComponent[] = []
    protected activeIndex = 0;

    private cdr = inject(ChangeDetectorRef);
    private el = inject(ElementRef);
    private readonly untilDestroyed = takeUntilDestroyed();

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

    protected onDrop(event: CdkDragDrop<DraggableTabComponent[]>): void {
        if (event.previousIndex === event.currentIndex) return;

        // keep activeIndex tracking the same tab after reorder
        const activeTab = this.tabs[this.activeIndex];
        moveItemInArray(this.tabs, event.previousIndex, event.currentIndex);
        this.activeIndex = this.tabs.indexOf(activeTab);
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

        animation.onfinish = () => {
            if (this.activeIndex >= index && this.activeIndex > 0) {
                this.activeIndex--;
            }
            this.tabs.splice(index, 1);
            this.tabClose.emit(index);
            this.cdr.detectChanges();
        };
    }
}