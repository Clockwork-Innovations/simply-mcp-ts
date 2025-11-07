"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Activity,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";

export function MetricsPanel() {
  const { metrics, clearMetrics, isEnabled, setEnabled } = useMetrics();

  const hasMetrics = metrics.totalOperations > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Usage Metrics</CardTitle>
            <CardDescription>
              Track operations, performance, and usage statistics
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="metrics-enabled"
                checked={isEnabled}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor="metrics-enabled" className="text-sm cursor-pointer">
                Track Metrics
              </Label>
            </div>
            <Button
              onClick={clearMetrics}
              disabled={!hasMetrics}
              variant="outline"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isEnabled && (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Metrics tracking is disabled</p>
            <p className="text-sm text-muted-foreground mt-2">
              Enable tracking to monitor usage statistics and performance
            </p>
          </div>
        )}

        {isEnabled && !hasMetrics && (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No metrics recorded yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Interact with the MCP server to start collecting metrics
            </p>
          </div>
        )}

        {isEnabled && hasMetrics && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Operations */}
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Total Operations
                    </span>
                  </div>
                  <p className="text-3xl font-bold">{metrics.totalOperations}</p>
                </CardContent>
              </Card>

              {/* Average Response Time */}
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Avg Response
                    </span>
                  </div>
                  <p className="text-3xl font-bold">
                    {metrics.averageResponseTime.toFixed(0)}
                    <span className="text-base font-normal text-muted-foreground ml-1">ms</span>
                  </p>
                </CardContent>
              </Card>

              {/* Success Rate */}
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Success Rate
                    </span>
                  </div>
                  <p className="text-3xl font-bold">
                    {metrics.successRate.toFixed(1)}
                    <span className="text-base font-normal text-muted-foreground ml-1">%</span>
                  </p>
                </CardContent>
              </Card>

              {/* Error Count */}
              <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Errors
                    </span>
                  </div>
                  <p className="text-3xl font-bold">{metrics.errorCount}</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Operations by Type */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Operations by Type
              </h3>
              <div className="space-y-3">
                {Object.entries(metrics.operationsByType)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const percentage = ((count / metrics.totalOperations) * 100).toFixed(1);
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize">
                              {type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {count} operation{count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-sm font-semibold">{percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <Separator />

            {/* Recent Operations */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Recent Operations
              </h3>
              {metrics.recentOperations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent operations</p>
              ) : (
                <div className="space-y-2">
                  {metrics.recentOperations.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {op.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="text-xs capitalize">
                              {op.type}
                            </Badge>
                            <span className="text-sm font-medium truncate">{op.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{op.timestamp.toLocaleTimeString()}</span>
                            <span>{op.duration.toFixed(0)}ms</span>
                          </div>
                          {op.error && (
                            <p className="text-xs text-red-500 mt-1 truncate">{op.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Metrics are persisted to browser localStorage and will survive page reloads.
                Clear metrics to reset all statistics.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
