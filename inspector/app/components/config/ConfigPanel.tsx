"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  RotateCcw,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useConfig } from "@/hooks/useConfig";

export function ConfigPanel() {
  const {
    settings,
    setSetting,
    resetToDefaults,
    exportConfig,
    importConfig,
  } = useConfig();

  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const handleExportConfig = () => {
    const configJson = exportConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcp-interpreter-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importConfig(content);

      if (success) {
        setImportStatus('success');
        setImportMessage('Configuration imported successfully!');
      } else {
        setImportStatus('error');
        setImportMessage('Failed to import configuration. Invalid format.');
      }

      // Clear message after 3 seconds
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 3000);
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Application Configuration</CardTitle>
            <CardDescription>
              Manage settings and preferences for the MCP Interpreter
            </CardDescription>
          </div>
          <Button
            onClick={resetToDefaults}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Import/Export Status */}
        {importStatus !== 'idle' && (
          <Alert variant={importStatus === 'success' ? 'default' : 'destructive'}>
            {importStatus === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{importMessage}</AlertDescription>
          </Alert>
        )}

        {/* Appearance Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h3 className="font-semibold">Appearance</h3>
          </div>

          <div className="space-y-4 pl-7">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme">Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Choose light or dark mode
                </p>
              </div>
              <Select
                value={settings.theme}
                onValueChange={(value) => setSetting('theme', value as 'light' | 'dark')}
              >
                <SelectTrigger id="theme" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Connection Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h3 className="font-semibold">Connection</h3>
          </div>

          <div className="space-y-4 pl-7">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-reconnect">Auto-reconnect on startup</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically reconnect to last server on page load
                </p>
              </div>
              <Switch
                id="auto-reconnect"
                checked={settings.autoReconnect}
                onCheckedChange={(checked) => setSetting('autoReconnect', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-server">Default Server Path</Label>
              <Input
                id="default-server"
                type="text"
                placeholder="/path/to/server.js"
                value={settings.defaultServerPath}
                onChange={(e) => setSetting('defaultServerPath', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Default path to use when connecting to a server
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Logging Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h3 className="font-semibold">Logging</h3>
          </div>

          <div className="space-y-4 pl-7">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="log-retention">Log Retention Limit</Label>
                <span className="text-sm font-semibold">
                  {settings.logRetentionLimit} messages
                </span>
              </div>
              <Slider
                id="log-retention"
                min={100}
                max={10000}
                step={100}
                value={[settings.logRetentionLimit]}
                onValueChange={(value) => setSetting('logRetentionLimit', value[0])}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of protocol messages to retain in memory
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Metrics Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h3 className="font-semibold">Metrics</h3>
          </div>

          <div className="space-y-4 pl-7">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="metrics-enabled">Enable Metrics Tracking</Label>
                <p className="text-sm text-muted-foreground">
                  Track usage statistics and performance metrics
                </p>
              </div>
              <Switch
                id="metrics-enabled"
                checked={settings.metricsEnabled}
                onCheckedChange={(checked) => setSetting('metricsEnabled', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Import/Export Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h3 className="font-semibold">Import/Export</h3>
          </div>

          <div className="space-y-3 pl-7">
            <p className="text-sm text-muted-foreground">
              Export your configuration to a JSON file or import a previously saved configuration.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={handleExportConfig}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Configuration
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex-1 relative"
                asChild
              >
                <label htmlFor="import-config" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Configuration
                  <input
                    id="import-config"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportConfig}
                  />
                </label>
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            All settings are persisted to browser localStorage and will be remembered across sessions.
            Changes to theme take effect immediately.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
