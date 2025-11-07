"use client";

import { useState } from 'react';
import type { Tool, ToolExecutionResult } from '@/lib/mcp/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, Play, X } from 'lucide-react';
import { ParameterForm } from './ParameterForm';
import { ResultViewer } from './ResultViewer';

interface ToolCardProps {
  tool: Tool;
  isExecuting: boolean;
  executionResult: ToolExecutionResult | null;
  error: string | null;
  onExecute: (args: Record<string, any>) => void;
  onClearResults: () => void;
}

export function ToolCard({
  tool,
  isExecuting,
  executionResult,
  error,
  onExecute,
  onClearResults,
}: ToolCardProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const hasParameters = tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0;

  const handleExecute = () => {
    // Clear previous results and errors
    onClearResults();

    // Validate required fields
    const errors: Record<string, string> = {};
    const required = tool.inputSchema.required || [];

    required.forEach((fieldName) => {
      if (!formValues[fieldName] || formValues[fieldName] === '') {
        errors[fieldName] = 'This field is required';
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear validation errors and execute
    setValidationErrors({});
    onExecute(formValues);
  };

  const handleFormChange = (values: Record<string, any>) => {
    setFormValues(values);
    // Clear validation error for changed field
    const changedFields = Object.keys(values).filter(
      (key) => values[key] !== formValues[key]
    );
    if (changedFields.length > 0) {
      const newErrors = { ...validationErrors };
      changedFields.forEach((field) => {
        delete newErrors[field];
      });
      setValidationErrors(newErrors);
    }
  };

  return (
    <div className="space-y-4">
      {/* Input Schema Summary */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Input Schema</h4>
        <div className="flex flex-wrap gap-2">
          {hasParameters ? (
            <>
              {Object.entries(tool.inputSchema.properties || {}).map(([name, schema]: [string, any]) => {
                const isRequired = tool.inputSchema.required?.includes(name);
                return (
                  <Badge key={name} variant={isRequired ? "default" : "secondary"}>
                    {name}: {schema.type || 'any'}
                    {isRequired && ' *'}
                  </Badge>
                );
              })}
            </>
          ) : (
            <Badge variant="outline">No parameters</Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Parameter Form */}
      {hasParameters && (
        <div>
          <ParameterForm
            schema={tool.inputSchema}
            values={formValues}
            errors={validationErrors}
            onChange={handleFormChange}
            disabled={isExecuting}
          />
        </div>
      )}

      {/* Execute Button */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleExecute}
          disabled={isExecuting}
          className="w-full sm:w-auto"
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Execute Tool
            </>
          )}
        </Button>
        {(executionResult || error) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearResults}
            disabled={isExecuting}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Execution Result */}
      {executionResult && (
        <div>
          <Separator className="my-4" />
          <ResultViewer result={executionResult} />
        </div>
      )}
    </div>
  );
}
