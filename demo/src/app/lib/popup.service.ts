import { ApplicationRef, ComponentFactoryResolver, Injectable, TemplateRef, ViewContainerRef } from '@angular/core';
import { PopupHostComponent } from './popup-host/popup-host.component';

export type PopupRect = {
  top?: number,
  left?: number,
  bottom?: number,
  right?: number,
  height?: number|undefined,
  width?: number|undefined,
  zIndex?: number|undefined
};

export type PopupData = {
  readonly tr: TemplateRef<any>,
  readonly rect: PopupRect,
  readonly overlay: boolean,
  readonly inOverlay: boolean
};

@Injectable({
  providedIn: 'root'
})
export class PopupService {

  private _hostComponent: PopupHostComponent|null = null;

  private _hostElement: HTMLElement|null = null;

  private readonly _popups: PopupData[] = [];

  constructor(appRef: ApplicationRef, factoryResolver: ComponentFactoryResolver) {
    setTimeout(() => {// Let the root component to be created
      const root = appRef.components[0];
      const popupHostFactory = factoryResolver.resolveComponentFactory(PopupHostComponent);
      const rootViewContainer = root.injector.get(ViewContainerRef);
      const popupHostComponentRef = popupHostFactory.create(root.injector);
      rootViewContainer.insert(popupHostComponentRef.hostView);
      this._hostElement = popupHostComponentRef.location.nativeElement;
      this._hostComponent = popupHostComponentRef.instance;
      this._hostComponent.update(this._popups);
    });
   }

   set(tr: TemplateRef<any>, rect: PopupRect, overlay: boolean, inOverlay: boolean): void{
    this._popups.push({tr, rect, overlay, inOverlay});
    this._hostComponent?.update(this._popups);
   }

   remove(tr: TemplateRef<any>): void{
    const i = this._popups.findIndex(p => p.tr === tr);
    if (i >= 0){
      this._popups.splice(i, 1);
    }
    this._hostComponent?.update(this._popups);
   }

   getHostElement(): HTMLElement|null{
     return this._hostElement;
   }
}
