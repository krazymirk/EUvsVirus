import { Directive, Input, TemplateRef, HostListener, OnInit, ElementRef, ComponentRef } from '@angular/core';
import {
  OverlayRef,
  Overlay,
  OverlayPositionBuilder
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { TooltipComponent } from './tooltip.component';
import { Observable } from 'rxjs';

@Directive({ selector: '[appTooltip]' })
export class TooltipDirective implements OnInit {
  @Input('appTooltip')
  set content(c: string | TemplateRef<any>) {
    this._content = c;
    if (this.overlayRef) {
      if (c) {
        this.show();
        setTimeout(() => {this.hide(); }, 1000);
      }
    }
  }
  @Input()
  set state(s: boolean) {
    this._state = s;
    if (this.overlayRef) {
      if (s) {
        this.show();
      } else {
        this.hide();
      }
    }
  }
  private overlayRef: OverlayRef;
  private _state: boolean;
  private _content: string | TemplateRef<any>;
  constructor(
    private overlayPositionBuilder: OverlayPositionBuilder,
    private elementRef: ElementRef,
    private overlay: Overlay
  ) {}

  ngOnInit() {
    const positionStrategy = this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        {
          originX: 'center',
          originY: 'center',
          overlayX: 'end',
          overlayY: 'center'
        }
      ]);

    this.overlayRef = this.overlay.create({ positionStrategy });
    this.show();
    setTimeout(() => {this.hide(); }, 1000);
  }

  @HostListener('mouseenter')
  show() {
    const tooltipPortal = new ComponentPortal(TooltipComponent);

    const tooltipRef: ComponentRef<TooltipComponent> = this.overlayRef.attach(
      tooltipPortal
    );

    if (typeof(this._content) === 'string') {
      tooltipRef.instance.text = this._content;
    } else {
      tooltipRef.instance.content = this._content;
    }
  }

  @HostListener('mouseout')
  hide() {
   this.overlayRef.detach();
  }
}