// src/client/remote-dom/RemoteDOMContext.tsx
import React, { createContext, useContext, useState, useCallback } from "react";
var RemoteDOMContext = createContext(null);
var RemoteDOMProvider = ({ manager, children }) => {
  const [eventHandlers] = useState(() => /* @__PURE__ */ new Map());
  const sendOperation = useCallback(
    async (operation) => {
      return manager.sendOperation(operation);
    },
    [manager]
  );
  const registerEventHandler = useCallback(
    (nodeId, eventType, handler) => {
      const handlerId = `${nodeId}-${eventType}-${Date.now()}-${Math.random()}`;
      eventHandlers.set(handlerId, handler);
      return handlerId;
    },
    [eventHandlers]
  );
  const unregisterEventHandler = useCallback(
    (handlerId) => {
      eventHandlers.delete(handlerId);
    },
    [eventHandlers]
  );
  const value = {
    manager,
    sendOperation,
    registerEventHandler,
    unregisterEventHandler,
    eventHandlers
  };
  return /* @__PURE__ */ React.createElement(RemoteDOMContext.Provider, { value }, children);
};
function useRemoteDOMManager() {
  const context = useContext(RemoteDOMContext);
  if (!context) {
    throw new Error("useRemoteDOMManager must be used within RemoteDOMProvider");
  }
  return context.manager;
}
function useRemoteDOMContext() {
  const context = useContext(RemoteDOMContext);
  if (!context) {
    throw new Error("useRemoteDOMContext must be used within RemoteDOMProvider");
  }
  return context;
}
var nodeIdCounter = 0;
function useRemoteDOMNodeId() {
  const [nodeId] = useState(() => `node-${++nodeIdCounter}`);
  return nodeId;
}
function resetNodeIdCounter() {
  nodeIdCounter = 0;
}
export {
  RemoteDOMProvider,
  resetNodeIdCounter,
  useRemoteDOMContext,
  useRemoteDOMManager,
  useRemoteDOMNodeId
};
//# sourceMappingURL=RemoteDOMContext.js.map
