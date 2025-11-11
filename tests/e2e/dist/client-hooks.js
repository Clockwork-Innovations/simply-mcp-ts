// src/client/hooks/useMCPTool.ts
import { useState, useCallback, useRef, useEffect } from "react";

// src/client/hooks/MCPProvider.tsx
import React, { createContext, useContext } from "react";
var defaultContextValue = {
  defaultOptions: {
    optimistic: true,
    parseAs: "json",
    retries: 0
  }
};
var MCPContext = createContext(defaultContextValue);
function MCPProvider({
  children,
  defaultOptions = {},
  onError,
  onSuccess,
  parseAs,
  optimistic,
  retries,
  retryDelay
}) {
  const mergedOptions = {
    ...defaultContextValue.defaultOptions,
    ...defaultOptions,
    ...parseAs !== void 0 && { parseAs },
    ...optimistic !== void 0 && { optimistic },
    ...retries !== void 0 && { retries },
    ...retryDelay !== void 0 && { retryDelay }
  };
  const value = {
    defaultOptions: mergedOptions,
    onError,
    onSuccess
  };
  return /* @__PURE__ */ React.createElement(MCPContext.Provider, { value }, children);
}
function useMCPContext() {
  return useContext(MCPContext);
}
function useMergedOptions(toolName, hookOptions = {}) {
  const context = useMCPContext();
  const merged = {
    ...context.defaultOptions,
    ...hookOptions
  };
  if (context.onError || hookOptions.onError) {
    const contextError = context.onError;
    const hookError = hookOptions.onError;
    merged.onError = (error, params, hookContext) => {
      contextError?.(error, toolName);
      hookError?.(error, params, hookContext);
    };
  }
  if (context.onSuccess || hookOptions.onSuccess) {
    const contextSuccess = context.onSuccess;
    const hookSuccess = hookOptions.onSuccess;
    merged.onSuccess = (data, result) => {
      contextSuccess?.(data, toolName);
      hookSuccess?.(data, result);
    };
  }
  return merged;
}

// src/client/hooks/useMCPTool.ts
function parseResult(result, parseAs) {
  if (parseAs === "raw") {
    return result;
  }
  const firstContent = result.content?.[0];
  if (!firstContent) {
    throw new Error("No content in tool result");
  }
  const text = firstContent.text || "";
  if (parseAs === "json") {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Failed to parse tool result as JSON: ${e.message}`);
    }
  }
  return text;
}
function getCacheKey(toolName, params) {
  return `${toolName}:${JSON.stringify(params)}`;
}
function useMCPTool(toolName, hookOptions = {}) {
  const options = useMergedOptions(toolName, hookOptions);
  const {
    onSuccess,
    onError,
    onMutate,
    optimistic = true,
    parseAs = "json",
    retries = 0,
    retryDelay = 1e3,
    deduplicate = true
  } = options;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [called, setCalled] = useState(false);
  const inflightRef = useRef(/* @__PURE__ */ new Map());
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      inflightRef.current.clear();
    };
  }, []);
  const executeWithRetry = useCallback(async (params, attempt = 0) => {
    try {
      if (typeof window === "undefined" || !window.callTool) {
        throw new Error("window.callTool is not available. Are you running in an MCP UI context?");
      }
      const result = await window.callTool(toolName, params);
      if (result.isError) {
        const errorText = result.content?.[0]?.text || "Tool execution failed";
        throw new Error(errorText);
      }
      return result;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        return executeWithRetry(params, attempt + 1);
      }
      throw err;
    }
  }, [toolName, retries, retryDelay]);
  const execute = useCallback(async (params = {}) => {
    const cacheKey = deduplicate ? getCacheKey(toolName, params) : null;
    if (cacheKey && inflightRef.current.has(cacheKey)) {
      return inflightRef.current.get(cacheKey);
    }
    const executionPromise = (async () => {
      let context = void 0;
      try {
        setCalled(true);
        if (optimistic) {
          setLoading(true);
          setError(null);
        }
        if (onMutate) {
          context = await onMutate(params);
        }
        const result = await executeWithRetry(params);
        const parsedData = parseResult(result, parseAs);
        if (isMountedRef.current) {
          setData(parsedData);
          setError(null);
          setLoading(false);
          if (onSuccess) {
            onSuccess(parsedData, result);
          }
        }
        return parsedData;
      } catch (err) {
        const error2 = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setError(error2);
          setData(null);
          setLoading(false);
          if (onError) {
            onError(error2, params, context);
          }
        }
        throw error2;
      } finally {
        if (cacheKey) {
          inflightRef.current.delete(cacheKey);
        }
      }
    })();
    if (cacheKey) {
      inflightRef.current.set(cacheKey, executionPromise);
    }
    return executionPromise;
  }, [toolName, optimistic, onMutate, onSuccess, onError, executeWithRetry, parseAs, deduplicate]);
  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setLoading(false);
      setData(null);
      setError(null);
      setCalled(false);
      inflightRef.current.clear();
    }
  }, []);
  return {
    execute,
    loading,
    data,
    error,
    reset,
    called
  };
}

// src/client/hooks/useMCPToolHelpers.ts
function isAnyLoading(tools) {
  return tools.some((tool) => tool.loading);
}
function areAllLoading(tools) {
  return tools.length > 0 && tools.every((tool) => tool.loading);
}
function hasAnyError(tools) {
  return tools.some((tool) => tool.error !== null);
}
function getAllErrors(tools) {
  return tools.map((tool) => tool.error).filter((error) => error !== null);
}
function resetAllTools(tools) {
  tools.forEach((tool) => tool.reset());
}

// src/client/hooks/usePromptSubmit.ts
import { useState as useState2, useCallback as useCallback2, useRef as useRef2, useEffect as useEffect2 } from "react";
function usePromptSubmit(options = {}) {
  const {
    onSubmit,
    onError,
    trackHistory = true,
    maxHistorySize = 50,
    preventDuplicates = true
  } = options;
  const [submitting, setSubmitting] = useState2(false);
  const [lastPrompt, setLastPrompt] = useState2(null);
  const [history, setHistory] = useState2([]);
  const [error, setError] = useState2(null);
  const isMountedRef = useRef2(true);
  useEffect2(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const submit = useCallback2(
    (prompt) => {
      try {
        if (typeof prompt !== "string" || !prompt.trim()) {
          throw new Error("Prompt must be a non-empty string");
        }
        const trimmedPrompt = prompt.trim();
        if (preventDuplicates && trimmedPrompt === lastPrompt) {
          console.warn("Duplicate prompt submission prevented:", trimmedPrompt);
          return;
        }
        if (typeof window === "undefined" || !window.submitPrompt) {
          throw new Error(
            "window.submitPrompt is not available. Are you running in an MCP UI context?"
          );
        }
        setSubmitting(true);
        setError(null);
        window.submitPrompt(trimmedPrompt);
        if (isMountedRef.current) {
          setLastPrompt(trimmedPrompt);
          setSubmitting(false);
          if (trackHistory) {
            setHistory((prev) => {
              const newHistory = [trimmedPrompt, ...prev];
              return newHistory.slice(0, maxHistorySize);
            });
          }
          if (onSubmit) {
            onSubmit(trimmedPrompt);
          }
        }
      } catch (err) {
        const error2 = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setError(error2);
          setSubmitting(false);
          if (onError) {
            onError(error2, prompt);
          }
        }
      }
    },
    [lastPrompt, trackHistory, maxHistorySize, preventDuplicates, onSubmit, onError]
  );
  const clearHistory = useCallback2(() => {
    setHistory([]);
  }, []);
  return {
    submit,
    submitting,
    lastPrompt,
    history,
    clearHistory,
    error
  };
}

// src/client/hooks/useIntent.ts
import { useState as useState3, useCallback as useCallback3, useRef as useRef3, useEffect as useEffect3 } from "react";
function useIntent(intentName, options = {}) {
  const {
    onTrigger,
    onError,
    trackHistory = true,
    maxHistorySize = 50,
    debounce = 0
  } = options;
  const [triggering, setTriggering] = useState3(false);
  const [lastParams, setLastParams] = useState3(null);
  const [history, setHistory] = useState3([]);
  const [error, setError] = useState3(null);
  const isMountedRef = useRef3(true);
  const debounceTimeoutRef = useRef3(null);
  useEffect3(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  const internalTrigger = useCallback3(
    (params = {}) => {
      try {
        if (typeof intentName !== "string" || !intentName.trim()) {
          throw new Error("Intent name must be a non-empty string");
        }
        if (typeof window === "undefined" || !window.triggerIntent) {
          throw new Error(
            "window.triggerIntent is not available. Are you running in an MCP UI context?"
          );
        }
        setTriggering(true);
        setError(null);
        window.triggerIntent(intentName, params);
        if (isMountedRef.current) {
          setLastParams(params);
          setTriggering(false);
          if (trackHistory) {
            setHistory((prev) => {
              const entry = {
                intent: intentName,
                params,
                timestamp: Date.now()
              };
              const newHistory = [entry, ...prev];
              return newHistory.slice(0, maxHistorySize);
            });
          }
          if (onTrigger) {
            onTrigger(params);
          }
        }
      } catch (err) {
        const error2 = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setError(error2);
          setTriggering(false);
          if (onError) {
            onError(error2, intentName, params);
          }
        }
      }
    },
    [intentName, trackHistory, maxHistorySize, onTrigger, onError]
  );
  const trigger = useCallback3(
    (params = {}) => {
      if (debounce > 0) {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          internalTrigger(params);
        }, debounce);
      } else {
        internalTrigger(params);
      }
    },
    [debounce, internalTrigger]
  );
  const clearHistory = useCallback3(() => {
    setHistory([]);
  }, []);
  return {
    trigger,
    triggering,
    lastParams,
    history,
    clearHistory,
    error
  };
}

// src/client/hooks/useNotify.ts
import { useState as useState4, useCallback as useCallback4, useRef as useRef4, useEffect as useEffect4 } from "react";
function useNotify(options = {}) {
  const {
    onNotify,
    onError,
    trackHistory = true,
    maxHistorySize = 100,
    rateLimit = 0
  } = options;
  const [history, setHistory] = useState4([]);
  const [lastNotification, setLastNotification] = useState4(null);
  const [notifyError, setNotifyError] = useState4(null);
  const isMountedRef = useRef4(true);
  const notificationTimesRef = useRef4([]);
  useEffect4(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const checkRateLimit = useCallback4(() => {
    if (rateLimit === 0) return true;
    const now = Date.now();
    const oneSecondAgo = now - 1e3;
    notificationTimesRef.current = notificationTimesRef.current.filter(
      (time) => time > oneSecondAgo
    );
    if (notificationTimesRef.current.length >= rateLimit) {
      return false;
    }
    notificationTimesRef.current.push(now);
    return true;
  }, [rateLimit]);
  const notify = useCallback4(
    (level, message) => {
      try {
        if (typeof message !== "string" || !message.trim()) {
          throw new Error("Message must be a non-empty string");
        }
        const validLevels = ["info", "success", "warning", "error"];
        if (!validLevels.includes(level)) {
          throw new Error(`Invalid notification level: ${level}`);
        }
        if (!checkRateLimit()) {
          console.warn("Notification rate limit exceeded");
          return;
        }
        if (typeof window === "undefined" || !window.notify) {
          throw new Error(
            "window.notify is not available. Are you running in an MCP UI context?"
          );
        }
        const trimmedMessage = message.trim();
        window.notify(level, trimmedMessage);
        if (isMountedRef.current) {
          const entry = {
            level,
            message: trimmedMessage,
            timestamp: Date.now()
          };
          setLastNotification(entry);
          setNotifyError(null);
          if (trackHistory) {
            setHistory((prev) => {
              const newHistory = [entry, ...prev];
              return newHistory.slice(0, maxHistorySize);
            });
          }
          if (onNotify) {
            onNotify(level, trimmedMessage);
          }
        }
      } catch (err) {
        const error2 = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setNotifyError(error2);
          if (onError) {
            onError(error2, level, message);
          }
        }
      }
    },
    [trackHistory, maxHistorySize, onNotify, onError, checkRateLimit]
  );
  const info = useCallback4((message) => notify("info", message), [notify]);
  const success = useCallback4((message) => notify("success", message), [notify]);
  const warning = useCallback4((message) => notify("warning", message), [notify]);
  const error = useCallback4((message) => notify("error", message), [notify]);
  const clearHistory = useCallback4(() => {
    setHistory([]);
  }, []);
  return {
    notify,
    info,
    success,
    warning,
    error,
    history,
    clearHistory,
    lastNotification,
    notifyError
  };
}

// src/client/hooks/useOpenLink.ts
import { useState as useState5, useCallback as useCallback5, useRef as useRef5, useEffect as useEffect5 } from "react";
function isValidUrl(urlString) {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "";
  }
}
function useOpenLink(options = {}) {
  const {
    onOpen,
    onError,
    validateUrl = true,
    httpsOnly = false,
    trackHistory = true,
    maxHistorySize = 50,
    allowedDomains = []
  } = options;
  const [opening, setOpening] = useState5(false);
  const [lastUrl, setLastUrl] = useState5(null);
  const [history, setHistory] = useState5([]);
  const [error, setError] = useState5(null);
  const isMountedRef = useRef5(true);
  useEffect5(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const open = useCallback5(
    (url) => {
      try {
        if (typeof url !== "string" || !url.trim()) {
          throw new Error("URL must be a non-empty string");
        }
        const trimmedUrl = url.trim();
        if (validateUrl && !isValidUrl(trimmedUrl)) {
          throw new Error(`Invalid URL format: ${trimmedUrl}`);
        }
        if (httpsOnly && !trimmedUrl.startsWith("https://")) {
          throw new Error(`Only HTTPS URLs are allowed: ${trimmedUrl}`);
        }
        if (allowedDomains.length > 0) {
          const domain = extractDomain(trimmedUrl);
          if (!allowedDomains.includes(domain)) {
            throw new Error(
              `Domain not allowed: ${domain}. Allowed domains: ${allowedDomains.join(", ")}`
            );
          }
        }
        if (typeof window === "undefined" || !window.openLink) {
          throw new Error(
            "window.openLink is not available. Are you running in an MCP UI context?"
          );
        }
        setOpening(true);
        setError(null);
        window.openLink(trimmedUrl);
        if (isMountedRef.current) {
          setLastUrl(trimmedUrl);
          setOpening(false);
          if (trackHistory) {
            setHistory((prev) => {
              const entry = {
                url: trimmedUrl,
                timestamp: Date.now()
              };
              const newHistory = [entry, ...prev];
              return newHistory.slice(0, maxHistorySize);
            });
          }
          if (onOpen) {
            onOpen(trimmedUrl);
          }
        }
      } catch (err) {
        const error2 = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setError(error2);
          setOpening(false);
          if (onError) {
            onError(error2, url);
          }
        }
      }
    },
    [
      validateUrl,
      httpsOnly,
      allowedDomains,
      trackHistory,
      maxHistorySize,
      onOpen,
      onError
    ]
  );
  const clearHistory = useCallback5(() => {
    setHistory([]);
  }, []);
  return {
    open,
    opening,
    lastUrl,
    history,
    clearHistory,
    error
  };
}
export {
  MCPProvider,
  areAllLoading,
  getAllErrors,
  hasAnyError,
  isAnyLoading,
  resetAllTools,
  useIntent,
  useMCPContext,
  useMCPTool,
  useMergedOptions,
  useNotify,
  useOpenLink,
  usePromptSubmit
};
//# sourceMappingURL=client-hooks.js.map
