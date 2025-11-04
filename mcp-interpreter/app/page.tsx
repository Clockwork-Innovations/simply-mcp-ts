"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionManager } from "./components/connection/ConnectionManager";
import { ToolsList } from "./components/tools/ToolsList";
import { ResourcesList } from "./components/resources/ResourcesList";
import { ResourceViewer } from "./components/resources/ResourceViewer";
import { SubscriptionManager } from "./components/subscriptions/SubscriptionManager";
import { PromptsList } from "./components/prompts/PromptsList";
import { RootsList } from "./components/roots/RootsList";
import { SamplingViewer } from "./components/sampling/SamplingViewer";
import { LogsViewer } from "./components/logs/LogsViewer";
import { MetricsPanel } from "./components/metrics/MetricsPanel";
import { ConfigPanel } from "./components/config/ConfigPanel";
import { useMCPConnection } from "@/hooks/useMCPConnection";
import { useResources } from "@/hooks/useResources";
import { useSubscriptions } from "@/hooks/useSubscriptions";

export default function MCPInterpreter() {
  const { connectionState } = useMCPConnection();
  const isConnected = connectionState === 'connected';

  const resources = useResources(isConnected);
  const subscriptions = useSubscriptions(isConnected);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">MCP Interpreter</h1>
        <p className="text-muted-foreground">
          Comprehensive test harness for all Model Context Protocol primitives
        </p>
      </header>

      {/* Connection Manager */}
      <ConnectionManager />

      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="roots">Roots</TabsTrigger>
          <TabsTrigger value="sampling">Sampling</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        {/* Tools Tab - with Elicitation support */}
        <TabsContent value="tools">
          <ToolsList />
        </TabsContent>

        {/* Resources Tab - with Subscriptions support */}
        <TabsContent value="resources">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Resources List */}
              <div className="space-y-6">
                <ResourcesList
                  resources={resources.resources}
                  selectedResource={resources.selectedResource}
                  isLoading={resources.isLoading}
                  error={resources.error}
                  activeSubscriptions={subscriptions.activeSubscriptions}
                  onSelectResource={resources.selectResource}
                  onRefresh={resources.loadResources}
                />
              </div>

              {/* Right column: Resource Viewer + Subscription Manager */}
              <div className="space-y-6">
                <ResourceViewer
                  resource={resources.selectedResource}
                  content={resources.content}
                  isLoading={resources.isLoadingContent}
                  lastUpdated={resources.lastUpdated}
                  isSubscribed={
                    resources.selectedResource
                      ? subscriptions.isSubscribed(resources.selectedResource.uri)
                      : false
                  }
                  onRefresh={resources.refreshContent}
                  onSubscribe={() => {
                    if (resources.selectedResource) {
                      subscriptions.subscribe(resources.selectedResource.uri);
                    }
                  }}
                  onUnsubscribe={() => {
                    if (resources.selectedResource) {
                      subscriptions.unsubscribe(resources.selectedResource.uri);
                    }
                  }}
                />

                <SubscriptionManager
                  subscriptions={subscriptions.subscriptions}
                  activeSubscriptions={subscriptions.activeSubscriptions}
                  onUnsubscribe={subscriptions.unsubscribe}
                  onUnsubscribeAll={subscriptions.unsubscribeAll}
                  onClearUpdates={subscriptions.clearUpdates}
                />
              </div>
            </div>
        </TabsContent>

        {/* Prompts Tab - with Completions support */}
        <TabsContent value="prompts">
          <PromptsList />
        </TabsContent>

        {/* Roots Tab */}
        <TabsContent value="roots">
          <RootsList />
        </TabsContent>

        {/* Sampling Tab */}
        <TabsContent value="sampling">
          <SamplingViewer />
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <LogsViewer />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <MetricsPanel />
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config">
          <ConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
