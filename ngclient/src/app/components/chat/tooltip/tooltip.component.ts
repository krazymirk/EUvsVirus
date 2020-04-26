import { Component, OnInit, Input, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: [ './tooltip.component.scss' ]
})
export class TooltipComponent {
  @Input() text: string;
  @Input() content: TemplateRef<any>;
}