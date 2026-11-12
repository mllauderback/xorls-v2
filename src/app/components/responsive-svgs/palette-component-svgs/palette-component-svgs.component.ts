import { Component, Input } from '@angular/core';
import { ComponentType } from '../../../models/components/Component';

@Component({
    selector: 'app-palette-component-svgs',
    imports: [],
    templateUrl: './palette-component-svgs.component.html'
})
export class PaletteComponentSvgsComponent {
    @Input() type: ComponentType | null = null;
    @Input() height = '2.4rem';
    @Input() width = '2.4rem';

    protected get componentTypes() { return ComponentType; }
}
