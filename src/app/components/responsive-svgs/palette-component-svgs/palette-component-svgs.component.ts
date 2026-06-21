import { Component, Input } from '@angular/core';
import * as gates from '../../../models/components/gates';
import * as io from '../../../models/components/io';
import *  as decorations from '../../../models/components/decorations';

@Component({
  selector: 'app-palette-component-svgs',
  imports: [],
  templateUrl: './palette-component-svgs.component.html'
})
export class PaletteComponentSvgsComponent {
  @Input() className = '';
  @Input() height = '2.4rem';
  @Input() width = '2.4rem';

  gates = gates;
  io = io;
  decorations = decorations;
}
