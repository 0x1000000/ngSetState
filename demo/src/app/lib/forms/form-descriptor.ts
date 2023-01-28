
export type FormField = {
  readonly descriptor: FieldDescriptor,
  readonly mandatory: boolean,
  readonly disabled: boolean,
  readonly tailButtons: TailButton[]|null
};

export type TailButton = {
  readonly title?: string,
  readonly iconId?: string,
  readonly clickArgument: any,
  readonly disabled?: boolean
};

export type FieldDescriptor =
  StringFieldDescriptor
  | NumericFieldDescriptor
  | BooleanFieldDescriptor
  | SelectStaticFieldDescriptor
  | CustomFieldDescriptor;

export type FieldDescriptorBase = {
  readonly id: string,
  readonly label: string,
  readonly note?: string
};

export type CustomFieldDescriptor = FieldDescriptorBase & {
  readonly type: 'custom',
  readonly subType: 'string',
};

export type StringFieldDescriptor = FieldDescriptorBase & {
  readonly type: 'text',
  readonly maxLength: number | undefined,
  readonly emptyToNull: boolean
};

export type NumericFieldDescriptor = FieldDescriptorBase & {
  readonly type: 'numeric',
  readonly min?: number|undefined
  readonly max?: number|undefined
};

export type BooleanFieldDescriptor = FieldDescriptorBase & {
  readonly type: 'bool'
};

export type SelectStaticFieldDescriptor = FieldDescriptorBase & {
  readonly type: 'select-static',
  readonly items: any[];
  readonly idMember: string;
  readonly textMember: string;
  readonly multi: boolean;
  readonly nullSelection: boolean
};
