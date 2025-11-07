"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { DirectionFilter, TypeFilter } from "@/hooks/useLogs";

interface LogFilterProps {
  directionFilter: DirectionFilter;
  typeFilter: TypeFilter;
  onDirectionChange: (filter: DirectionFilter) => void;
  onTypeChange: (filter: TypeFilter) => void;
  onReset: () => void;
}

export function LogFilter({
  directionFilter,
  typeFilter,
  onDirectionChange,
  onTypeChange,
  onReset,
}: LogFilterProps) {
  const hasActiveFilters = directionFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="flex items-end gap-4 p-4 bg-muted/30 rounded-lg">
      <div className="flex-1">
        <Label htmlFor="direction-filter" className="text-xs mb-1.5 block">
          Direction
        </Label>
        <Select value={directionFilter} onValueChange={onDirectionChange}>
          <SelectTrigger id="direction-filter" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="received">Received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <Label htmlFor="type-filter" className="text-xs mb-1.5 block">
          Type
        </Label>
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger id="type-filter" className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="request">Request</SelectItem>
            <SelectItem value="response">Response</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={onReset}
        disabled={!hasActiveFilters}
        variant="outline"
        size="sm"
        className="h-9"
      >
        <X className="w-4 h-4 mr-1" />
        Clear Filters
      </Button>
    </div>
  );
}
