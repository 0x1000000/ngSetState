import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { Calc, initializeStateTracking } from "ng-set-state";
import { Country, countryList } from '../Countries';

@Component({
    selector: 'drop-down-demo',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: "./drop-down-demo.component.html"
})
export class DropDownDemoComponent implements OnInit, OnDestroy {

    constructor(private _cd: ChangeDetectorRef) {
        initializeStateTracking<DropDownDemoComponent>(this, {
            includeAllPredefinedFields: true,
            onStateApplied: () => this.onAfterStateApplied()
        });
    }

    public selectedCountry: string | null = null;

    public countryList: Country[] = countryList;

    @Calc(["itemTemplateCustom", "useCustomTemplate"], s => s.useCustomTemplate ? s.itemTemplateCustom : null)
    public itemTemplate: any = null;

    public useCustomTemplate: boolean = false;

    public isDestroyed: boolean = false;

    @ViewChild("itemTemplateCustom", { static: true })
    public itemTemplateCustom: any = null;

    public ngOnDestroy(): void {
        this.isDestroyed = true;
    }

    public ngOnInit(): void {
        this._cd.detach();
        this._cd.detectChanges();
    }

    public onAfterStateApplied(): void {
        if (!this.isDestroyed) {
            this._cd.detectChanges();
        }
    }
}
