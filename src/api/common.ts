import { OnChanges } from "@angular/core";

export interface Constructor<T> { new(...args: any[]): T; }

export interface NgComponentType extends Constructor<OnChanges> {}