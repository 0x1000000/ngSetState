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
