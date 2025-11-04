"use client";

import { useState } from 'react';
import type { ElicitationRequest, ElicitationResponse } from '@/lib/mcp/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface ElicitationFormProps {
  request: ElicitationRequest;
  onSubmit: (response: ElicitationResponse) => void;
  onCancel: () => void;
}

export function ElicitationForm({ request, onSubmit, onCancel }: ElicitationFormProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fields = request.data.fields || [];
  const prompt = request.data.prompt || 'Please provide the following information:';

  const handleChange = (name: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.required && (!formValues[field.name] || formValues[field.name] === '')) {
        newErrors[field.name] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit response
    onSubmit({ fields: formValues });
  };

  const renderField = (field: any) => {
    const value = formValues[field.name];
    const error = errors[field.name];
    const fieldType = field.type || 'text';

    return (
      <div key={field.name} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={field.name}>
            {field.label || field.name}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Badge variant="outline" className="text-xs">
            {fieldType}
          </Badge>
        </div>

        {/* Boolean field */}
        {fieldType === 'boolean' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={value === true}
              onCheckedChange={(checked) => handleChange(field.name, checked === true)}
            />
            <Label htmlFor={field.name} className="font-normal cursor-pointer">
              Enable
            </Label>
          </div>
        )}

        {/* Select field */}
        {fieldType === 'select' && field.options && (
          <Select
            value={value || ''}
            onValueChange={(val) => handleChange(field.name, val)}
          >
            <SelectTrigger id={field.name}>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Number field */}
        {fieldType === 'number' && (
          <Input
            id={field.name}
            type="number"
            value={value ?? ''}
            onChange={(e) => {
              const numValue = e.target.value === '' ? '' : Number(e.target.value);
              handleChange(field.name, numValue);
            }}
            placeholder={`Enter ${field.label || field.name}...`}
          />
        )}

        {/* Text field (default) */}
        {fieldType === 'text' && (
          <Input
            id={field.name}
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={`Enter ${field.label || field.name}...`}
          />
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>User Input Required</DialogTitle>
          <DialogDescription>
            {prompt}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fields.length > 0 ? (
            fields.map((field) => renderField(field))
          ) : (
            <p className="text-sm text-muted-foreground">
              No fields to collect.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
