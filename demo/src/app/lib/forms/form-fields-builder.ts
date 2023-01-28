import { FormField, TailButton } from './form-descriptor';

export class FormFieldsBuilder<T> {
  private _formFields: FormField[] = [];

  public done(): FormField[]{
    return this._formFields;
  }

  public addTextField(params: {id: keyof T, label: string, maxLength?: number, note?: string, emptyToNull?: boolean, tailButton?: TailButton}): FormFieldsBuilder<T>{
    this._formFields.push(
      {
        descriptor:
        {
          type: 'text',
          id: params.id as string,
          label: params.label,
          maxLength: params.maxLength ?? 255,
          note: params.note,
          emptyToNull: params.emptyToNull ?? false
        },
        mandatory: false,
        disabled: false,
        tailButtons: null
      });
    return this;
  }

  public addNumericField(params: {id: keyof T, label: string, min?: number|undefined, max?: number, note?: string}): FormFieldsBuilder<T>{
    this._formFields.push(
      {
        descriptor:
        {
          type: 'numeric',
          id: params.id as string,
          label: params.label,
          min: params.min,
          max: params.max,
          note: params.note
        },
        mandatory: false,
        disabled: false,
        tailButtons: null
      });
    return this;
  }

  public addSelectField(params: {id: keyof T, label: string, items: any[], multi?: boolean, idMember: string, textMember: string, note?: string, nullSelection?: boolean}): FormFieldsBuilder<T>{
    this._formFields.push(
      {
        descriptor:
        {
          type: 'select-static',
          id: params.id as string,
          label: params.label,
          items: params.items,
          idMember: params.idMember,
          textMember: params.textMember,
          multi: params.multi ?? false,
          note: params.note,
          nullSelection: params.nullSelection ?? false
        },
        mandatory: false,
        disabled: false,
        tailButtons: null
      });
    return this;
  }

  public addBoolField(params: {id: keyof T, label: string, note?: string}): FormFieldsBuilder<T>{
    this._formFields.push(
      {
        descriptor:
        {
          type: 'bool',
          id: params.id as string,
          label: params.label,
          note: params.note,
        },
        mandatory: false,
        disabled: false,
        tailButtons: null
      });
    return this;
  }

  public mandatory(id?: keyof T): FormFieldsBuilder<T> {
    (this.findField(id) as Writeable<FormField, 'mandatory'>).mandatory = true;
    return this;
  }

  public mandatoryIf(condition: boolean, id?: keyof T): FormFieldsBuilder<T> {
    if (condition){
      this.mandatory(id);
    }
    return this;
  }

  public disabled(id?: keyof T): FormFieldsBuilder<T> {
    (this.findField(id) as Writeable<FormField, 'disabled'>).disabled = true;
    return this;
  }

  public disabledIf(condition: boolean, id?: keyof T): FormFieldsBuilder<T> {
   if (condition){
     this.disabled(id);
   }
   return this;
  }

  public withTailButtons(tailButtons: TailButton|TailButton[]|null, id?: keyof T): FormFieldsBuilder<T> {
    (this.findField(id) as Writeable<FormField, 'tailButtons'>).tailButtons = tailButtons != null
      ? Array.isArray(tailButtons)
        ? tailButtons
        : [tailButtons]
      : null;
    return this;
   }

  private findField(id?: keyof T): FormField{
    if (this._formFields.length > 0){

      let index = this._formFields.length - 1;
      if (id != null){
        index = this._formFields.findIndex(f => f.descriptor.id === id);
      }
      if (index < 0){
        throw new Error(`Could not find field '${id?.toString()}'`);
      }
      return this._formFields[index];
    }
    throw new Error('The filed list is empty');
  }
}

type Writeable<T extends { [x: string]: any }, K extends string> = {
  [P in K]: T[P];
};

