import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { PopupData } from '../popup.service';

@Component({
  selector: 'pop-host',
  templateUrl: './popup-host.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopupHostComponent {

  popups: PopupData[] = [];

  inOverlayPopups: PopupData[]|null = null;

  constructor(private readonly _cd: ChangeDetectorRef) { }

  update(popups: PopupData[]): void {

    this.inOverlayPopups = null;
    this.popups = popups;
    if(popups.some(p=>p.inOverlay)){
      this.popups = popups.filter(p=>!p.inOverlay);
      this.inOverlayPopups = popups.filter(p=>p.inOverlay);
    }
    this._cd.detectChanges();
  }

  isCenter(p: PopupData): boolean{
    return p.overlay
      && p.rect.left == null
      && p.rect.right == null
      && p.rect.top == null
      && p.rect.bottom == null;
  }
}
