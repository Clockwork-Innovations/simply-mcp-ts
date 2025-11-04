"use client";

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Radio } from 'lucide-react';
import type { Resource } from '@/lib/mcp/types';

export interface ResourcesListProps {
  resources: Resource[];
  selectedResource: Resource | null;
  isLoading: boolean;
  error: string | null;
  activeSubscriptions: string[];
  onSelectResource: (resource: Resource) => void;
  onRefresh: () => void;
}

/**
 * Component that displays a list of available resources
 * Shows URI, name, description, MIME type, and subscription status
 */
export function ResourcesList({
  resources,
  selectedResource,
  isLoading,
  error,
  activeSubscriptions,
  onSelectResource,
  onRefresh,
}: ResourcesListProps) {
  const isSubscribed = (uri: string) => activeSubscriptions.includes(uri);

  const getMimeTypeColor = (mimeType?: string) => {
    if (!mimeType) return 'default';
    if (mimeType.startsWith('text/')) return 'secondary';
    if (mimeType.startsWith('application/json')) return 'default';
    if (mimeType.startsWith('text/html')) return 'outline';
    return 'default';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading resources...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (resources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>No resources available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No resources are exposed by the connected server.
          </p>
          <Button onClick={onRefresh} variant="outline" className="mt-4">
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Available Resources</h3>
          <p className="text-sm text-muted-foreground">
            {resources.length} resource{resources.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      <div className="grid gap-3">
        {resources.map((resource) => {
          const isSelected = selectedResource?.uri === resource.uri;
          const hasSubscription = isSubscribed(resource.uri);

          return (
            <Card
              key={resource.uri}
              className={`cursor-pointer transition-all hover:border-primary ${
                isSelected ? 'border-primary shadow-sm' : ''
              }`}
              onClick={() => onSelectResource(resource)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <CardTitle className="text-base truncate">{resource.name}</CardTitle>
                    </div>
                    <code className="text-xs text-muted-foreground break-all">
                      {resource.uri}
                    </code>
                  </div>

                  <div className="flex flex-col gap-1 items-end flex-shrink-0">
                    {hasSubscription && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Radio className="h-3 w-3" />
                        Subscribed
                      </Badge>
                    )}
                    {resource.mimeType && (
                      <Badge variant={getMimeTypeColor(resource.mimeType)}>
                        {resource.mimeType}
                      </Badge>
                    )}
                  </div>
                </div>

                {resource.description && (
                  <CardDescription className="text-xs mt-2">
                    {resource.description}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
