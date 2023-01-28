import { Directive, Input, OnChanges, OnDestroy, SimpleChanges, TemplateRef } from '@angular/core';
import { PopupRect, PopupService } from '../popup.service';

@Directive({
  selector: '[sqPopupRect]',
})
export class PopupRectDirective implements OnDestroy, OnChanges {

  constructor(private readonly _popupService: PopupService, private _tr: TemplateRef<any>) {
  }

  private readonly _rect: PopupRect = {};

  @Input('sqPopupRect')
  visible = false;

  @Input('sqPopupRectTop')
  top: number | undefined;

  @Input('sqPopupRectLeft')
  left: number | undefined;

  @Input('sqPopupRectBottom')
  bottom: number | undefined;

  @Input('sqPopupRectRight')
  right: number | undefined;

  @Input('sqPopupRectHeight')
  height: number | undefined;

  @Input('sqPopupRectWidth')
  width: number | undefined;

  @Input('sqPopupRectOverlay')
  overlay: boolean | undefined;

  @Input('sqPopupRectInOverlay')
  inOverlay: boolean | undefined;

  ngOnChanges(changes: SimpleChanges): void {
    this._rect.top = this.top;
    this._rect.left = this.left;
    this._rect.bottom = this.bottom;
    this._rect.right = this.right;
    this._rect.height = this.height;
    this._rect.width = this.width;

    if (changes['visible'].previousValue === true && changes['visible'].currentValue === false){
      this._popupService.remove(this._tr);
    }

    if (this.visible){
      this._popupService.set(this._tr, this._rect, this.overlay === true, this.inOverlay === true);
    }
  }

  ngOnDestroy(): void {
    if (this.visible){
       this._popupService.remove(this._tr);
    }
  }
}
