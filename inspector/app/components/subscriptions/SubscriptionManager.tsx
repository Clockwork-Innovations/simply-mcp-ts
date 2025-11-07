"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Radio, Trash2, XCircle } from 'lucide-react';
import { SubscriptionUpdateViewer } from './SubscriptionUpdateViewer';
import type { SubscriptionState } from '@/hooks/useSubscriptions';

export interface SubscriptionManagerProps {
  subscriptions: Map<string, SubscriptionState>;
  activeSubscriptions: string[];
  onUnsubscribe: (uri: string) => void;
  onUnsubscribeAll: () => void;
  onClearUpdates: (uri: string) => void;
}

/**
 * Component that manages all active subscriptions
 * Shows subscription status, update count, and recent updates
 */
export function SubscriptionManager({
  subscriptions,
  activeSubscriptions,
  onUnsubscribe,
  onUnsubscribeAll,
  onClearUpdates,
}: SubscriptionManagerProps) {
  if (activeSubscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
          <CardDescription>No active subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Subscribe to resources to receive real-time updates. Click the Subscribe button on
              any subscribable resource.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Active Subscriptions
            </CardTitle>
            <CardDescription>
              {activeSubscriptions.length} subscription{activeSubscriptions.length !== 1 ? 's' : ''} active
            </CardDescription>
          </div>

          {activeSubscriptions.length > 0 && (
            <Button
              onClick={onUnsubscribeAll}
              variant="destructive"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Unsubscribe All
            </Button>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <Accordion type="multiple" className="space-y-2">
          {activeSubscriptions.map((uri) => {
            const subscription = subscriptions.get(uri);
            if (!subscription) return null;

            const hasUpdates = subscription.updates.length > 0;
            const hasNewUpdates = subscription.updates.some(u => u.isNew);

            return (
              <AccordionItem key={uri} value={uri} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center justify-between gap-2 w-full pr-2">
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <Radio className="h-4 w-4 text-primary flex-shrink-0" />
                        <code className="text-sm font-medium truncate">{uri}</code>
                      </div>
                      {subscription.lastUpdate && (
                        <p className="text-xs text-muted-foreground">
                          Last update: {subscription.lastUpdate.toLocaleTimeString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasNewUpdates && (
                        <Badge variant="default" className="animate-pulse">
                          New
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {subscription.updateCount} update{subscription.updateCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-2 pb-3">
                  <div className="space-y-3">
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onUnsubscribe(uri)}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Unsubscribe
                      </Button>

                      {hasUpdates && (
                        <Button
                          onClick={() => onClearUpdates(uri)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear History
                        </Button>
                      )}
                    </div>

                    {/* Error display */}
                    {subscription.error && (
                      <Alert variant="destructive">
                        <AlertDescription>{subscription.error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Updates list */}
                    {hasUpdates ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Recent Updates</h4>
                        {subscription.updates.map((update, index) => (
                          <SubscriptionUpdateViewer
                            key={`${uri}-${update.timestamp.getTime()}`}
                            update={update}
                            index={index}
                          />
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <AlertDescription>
                          No updates received yet. Waiting for resource changes...
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
