"use client";

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus } from 'lucide-react';

interface ParameterFormProps {
  schema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
  values: Record<string, any>;
  errors: Record<string, string>;
  onChange: (values: Record<string, any>) => void;
  disabled?: boolean;
}

export function ParameterForm({
  schema,
  values,
  errors,
  onChange,
  disabled = false,
}: ParameterFormProps) {
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        This tool does not require any parameters.
      </div>
    );
  }

  const handleChange = (name: string, value: any) => {
    onChange({
      ...values,
      [name]: value,
    });
  };

  const handleArrayAdd = (name: string) => {
    const currentArray = values[name] || [];
    handleChange(name, [...currentArray, '']);
  };

  const handleArrayRemove = (name: string, index: number) => {
    const currentArray = values[name] || [];
    const newArray = currentArray.filter((_: any, i: number) => i !== index);
    handleChange(name, newArray);
  };

  const handleArrayItemChange = (name: string, index: number, value: any) => {
    const currentArray = values[name] || [];
    const newArray = [...currentArray];
    newArray[index] = value;
    handleChange(name, newArray);
  };

  const renderField = (name: string, paramSchema: any) => {
    const isRequired = schema.required?.includes(name) || paramSchema.required;
    const value = values[name];
    const error = errors[name];

    // Determine field type from schema
    let fieldType = paramSchema.type;

    // Handle enum as select
    if (paramSchema.enum && Array.isArray(paramSchema.enum)) {
      fieldType = 'enum';
    }

    // Handle integer as number
    if (fieldType === 'integer') {
      fieldType = 'number';
    }

    return (
      <div key={name} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={name}>
            {name}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
          {fieldType && (
            <Badge variant="outline" className="text-xs">
              {fieldType}
            </Badge>
          )}
        </div>

        {paramSchema.description && (
          <p className="text-xs text-muted-foreground">
            {paramSchema.description}
          </p>
        )}

        {renderInput(name, paramSchema, value, fieldType, isRequired)}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  };

  const renderInput = (
    name: string,
    paramSchema: any,
    value: any,
    fieldType: string,
    isRequired: boolean
  ) => {
    // Boolean (checkbox)
    if (fieldType === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={name}
            checked={value === true}
            onCheckedChange={(checked) => handleChange(name, checked === true)}
            disabled={disabled}
          />
          <Label htmlFor={name} className="font-normal cursor-pointer">
            {paramSchema.title || 'Enable'}
          </Label>
        </div>
      );
    }

    // Enum (select dropdown)
    if (fieldType === 'enum' && paramSchema.enum) {
      return (
        <Select
          value={value || ''}
          onValueChange={(val) => handleChange(name, val)}
          disabled={disabled}
        >
          <SelectTrigger id={name}>
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {paramSchema.enum.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Number/Integer
    if (fieldType === 'number') {
      return (
        <Input
          id={name}
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const numValue = e.target.value === '' ? '' : Number(e.target.value);
            handleChange(name, numValue);
          }}
          min={paramSchema.min ?? paramSchema.minimum}
          max={paramSchema.max ?? paramSchema.maximum}
          disabled={disabled}
          placeholder={`Enter ${name}...`}
        />
      );
    }

    // Array
    if (fieldType === 'array') {
      const arrayValue = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {arrayValue.map((item: any, index: number) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item || ''}
                onChange={(e) => handleArrayItemChange(name, index, e.target.value)}
                disabled={disabled}
                placeholder={`Item ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleArrayRemove(name, index)}
                disabled={disabled}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleArrayAdd(name)}
            disabled={disabled}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      );
    }

    // Object (nested fields)
    if (fieldType === 'object' && paramSchema.properties) {
      const objectValue = value || {};
      return (
        <div className="border rounded-md p-4 space-y-4">
          {Object.entries(paramSchema.properties).map(([propName, propSchema]: [string, any]) => {
            const fullName = `${name}.${propName}`;
            return (
              <div key={propName} className="space-y-2">
                <Label htmlFor={fullName}>{propName}</Label>
                {propSchema.description && (
                  <p className="text-xs text-muted-foreground">
                    {propSchema.description}
                  </p>
                )}
                <Input
                  id={fullName}
                  value={objectValue[propName] || ''}
                  onChange={(e) => {
                    handleChange(name, {
                      ...objectValue,
                      [propName]: e.target.value,
                    });
                  }}
                  disabled={disabled}
                  placeholder={`Enter ${propName}...`}
                />
              </div>
            );
          })}
        </div>
      );
    }

    // String (default with regex validation)
    return (
      <Input
        id={name}
        type="text"
        value={value || ''}
        onChange={(e) => handleChange(name, e.target.value)}
        disabled={disabled}
        placeholder={`Enter ${name}...`}
        minLength={paramSchema.minLength}
        maxLength={paramSchema.maxLength}
        pattern={paramSchema.regex || paramSchema.pattern}
      />
    );
  };

  return (
    <div className="space-y-4">
      {Object.entries(schema.properties).map(([name, paramSchema]) =>
        renderField(name, paramSchema)
      )}
    </div>
  );
}
