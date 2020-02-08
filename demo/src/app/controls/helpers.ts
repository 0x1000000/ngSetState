export function extractMandatoryMember(item: Object, member: string|null): Object {
    if (item == null) {
        throw new Error("Item cannot be null or undefined");
    }

    if (member == null || member === "") {
        return item;
    }

    const id = item[member];

    if (id == null) {
        throw new Error(member + " member cannot be null or undefined");
    }

    return id;
}

export function delayMs(durationMs: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), durationMs));
}

export function focusFirstDescendantOrSelf(el: Element, deep: boolean): boolean {
    const filter = "button, [href], input, select, textarea, [tabindex]:not([tabindex=' - 1'])";

    if (!deep && matches(el, filter)) {
        (<HTMLElement>el).focus();
        return true;
    }

    const descendant = el.querySelector(filter);
    if (descendant && focusFirstDescendantOrSelf(descendant, deep)) {
        return true;
    }

    if (deep && matches(el, filter)) {
        (<HTMLElement>el).focus();
        return true;
    }

    return false;

    function matches(sEl: Element, selector: string): boolean {
        if (sEl.matches) {
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

export function scrollIntoViewIfNeeded(el: HTMLElement) {

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
