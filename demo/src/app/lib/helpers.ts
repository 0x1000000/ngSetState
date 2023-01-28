export function delayMs(durationMs: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), durationMs));
}

export function extractMandatoryMember(item: object, member: string|null): object {
    if (item == null) {
        throw new Error('Item cannot be null or undefined');
    }

    if (member == null || member === '') {
        return item;
    }

    const id = (item as any)[member];

    if (id == null) {
        throw new Error(member + ' member cannot be null or undefined');
    }

    return id;
}

export function focusFirstDescendantOrSelf(el: Element, deep: boolean): boolean {
    const filter = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex=\' - 1\'])';

    if (!deep && matches(el, filter)) {
        ( el as HTMLElement).focus();
        return true;
    }

    const descendant = el.querySelector(filter);
    if (descendant && focusFirstDescendantOrSelf(descendant, deep)) {
        return true;
    }

    if (deep && matches(el, filter)) {
        ( el as HTMLElement).focus();
        return true;
    }

    return false;

    function matches(sEl: Element, selector: string): boolean {
        if (sEl.matches != null) {
            return el.matches(selector);
        }
        if (sEl.parentElement) {
            const sub = sEl.parentElement.querySelectorAll(selector);
            for (let i = 0; i < sub.length; i++) {
                if (sub[i] === sEl) {
                    return true;
                }
            }
        }
        return false;
    }

}

export function scrollIntoViewIfNeeded(el: HTMLElement): void {

    const parent = el.parentElement;
    if (parent == null) {
        return;
    }
    const overTop = el.offsetTop - parent.offsetTop < parent.scrollTop;
    const overBottom = (el.offsetTop - parent.offsetTop + el.clientHeight) > (parent.scrollTop + parent.clientHeight);
    const alignWithTop = overTop && !overBottom;
    if (overTop || overBottom) {
        el.scrollIntoView(alignWithTop);
    }
}

export function arraysAreEqual<T>(arr1: T[]|null, arr2: T[]|null): boolean{
    if (arr1 === arr2){
        return true;
    }

    if (arr1 != null && arr2 != null){
        if (arr1.length === arr2.length) {
            for (let i = 0; i < arr1.length; i++){
                if (arr1[i] !== arr2[i]){
                    return false;
                }
            }
            return true;
        }
    }
    return arr1 == null && arr2 == null;
}


export function areEqualArr(obj1: any, obj2: any): boolean {
    if (obj1 === obj2){
        return true;
    }

    if (Array.isArray(obj1) && Array.isArray(obj2)){
        if (obj1.length !== obj2.length){
            return false;
        }
        for (let i = 0; i < obj1.length; i++){
            if (obj1[i] !== obj2[i]){
                return false;
            }
        }
        return true;
    }
    return false;
}

export function deepEqual(x: any, y: any): boolean {
    if (x === y) {
      return true;
    }
    else if ((typeof x === 'object' && x != null) && (typeof y === 'object' && y != null)) {
      const xKeys = Object.keys(x);
      const yKeys = Object.keys(y);

      if (xKeys.length !== yKeys.length){
        return false;
      }
      for (const k of xKeys){
        if (y.hasOwnProperty(k)){
            if (!deepEqual(x[k], y[k])){
                return false;
            }
        }
        else{
            return false;
        }
      }
      return true;
    }
    else {
      return false;
    }
}

export function makeId(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}