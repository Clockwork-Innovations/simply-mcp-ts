// src/client/remote-dom/component-library-v2.tsx
import React2, { useEffect } from "react";

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

// src/client/remote-dom/component-library-v2.tsx
function serializeStyle(style) {
  if (!style) return "";
  return Object.entries(style).map(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    const numericSizeProps = [
      "width",
      "height",
      "top",
      "right",
      "bottom",
      "left",
      "margin",
      "padding",
      "font-size",
      "line-height",
      "border-width",
      "border-radius"
    ];
    let cssValue = value;
    if (typeof value === "number" && numericSizeProps.some((prop) => cssKey.includes(prop))) {
      cssValue = `${value}px`;
    }
    return `${cssKey}: ${cssValue}`;
  }).join("; ");
}
function serializeEventListener(handler) {
  return `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function createRemoteDOMComponent(displayName, config) {
  const Component = (props) => {
    const nodeId = useRemoteDOMNodeId();
    const { sendOperation, registerEventHandler, unregisterEventHandler } = useRemoteDOMContext();
    useEffect(() => {
      sendOperation({
        type: "createElement",
        nodeId,
        tagName: config.tagName
      });
      const attributes = config.mapProps(props);
      for (const [name, value] of Object.entries(attributes)) {
        if (value !== void 0 && value !== null) {
          sendOperation({
            type: "setAttribute",
            nodeId,
            attributeName: name,
            attributeValue: String(value)
          });
        }
      }
      const handlerIds = [];
      if (config.mapEvents) {
        const events = config.mapEvents(props);
        for (const [eventType, handler] of Object.entries(events)) {
          if (handler && typeof handler === "function") {
            const handlerId = registerEventHandler(nodeId, eventType, handler);
            handlerIds.push(handlerId);
            sendOperation({
              type: "addEventListener",
              nodeId,
              eventType,
              eventListener: handlerId
            });
          }
        }
      }
      return () => {
        handlerIds.forEach((handlerId) => {
          unregisterEventHandler(handlerId);
        });
        sendOperation({
          type: "removeChild",
          childId: nodeId
        });
      };
    }, [nodeId, sendOperation, registerEventHandler, unregisterEventHandler, props]);
    if (config.renderChildren && props.children) {
      return /* @__PURE__ */ React2.createElement(React2.Fragment, null, props.children);
    }
    return null;
  };
  Component.displayName = displayName;
  return Component;
}
var Container = createRemoteDOMComponent("Container", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      maxWidth: props.maxWidth,
      padding: props.padding
    })
  }),
  tagName: "div",
  renderChildren: true
});
var Row = createRemoteDOMComponent("Row", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "flex",
      flexDirection: "row",
      gap: props.gap,
      alignItems: props.align,
      justifyContent: props.justify
    })
  }),
  tagName: "div",
  renderChildren: true
});
var Column = createRemoteDOMComponent("Column", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "flex",
      flexDirection: "column",
      gap: props.gap,
      alignItems: props.align
    })
  }),
  tagName: "div",
  renderChildren: true
});
var Grid = createRemoteDOMComponent("Grid", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "grid",
      gridTemplateColumns: typeof props.columns === "number" ? `repeat(${props.columns}, 1fr)` : props.columns,
      gap: props.gap,
      rowGap: props.rowGap,
      columnGap: props.columnGap
    })
  }),
  tagName: "div",
  renderChildren: true
});
var Stack = createRemoteDOMComponent("Stack", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "flex",
      flexDirection: props.direction === "horizontal" ? "row" : "column",
      gap: props.gap || "8px",
      alignItems: props.align
    })
  }),
  tagName: "div",
  renderChildren: true
});
var Spacer = createRemoteDOMComponent("Spacer", {
  mapProps: (props) => ({
    style: serializeStyle({
      ...props.style,
      width: props.size || "8px",
      height: props.size || "8px"
    })
  }),
  tagName: "div",
  renderChildren: false
});
var Divider = createRemoteDOMComponent("Divider", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      width: props.orientation === "vertical" ? props.thickness || "1px" : "100%",
      height: props.orientation === "vertical" ? "100%" : props.thickness || "1px",
      backgroundColor: props.color || "#e0e0e0"
    })
  }),
  tagName: "hr",
  renderChildren: false
});
var Section = createRemoteDOMComponent("Section", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle(props.style)
  }),
  tagName: "section",
  renderChildren: true
});
var Panel = createRemoteDOMComponent("Panel", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      padding: props.padding || "16px",
      border: props.bordered ? "1px solid #e0e0e0" : "none",
      boxShadow: props.shadow ? "0 2px 8px rgba(0,0,0,0.1)" : "none"
    })
  }),
  tagName: "div",
  renderChildren: true
});
var Card = createRemoteDOMComponent("Card", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      padding: props.padding || "16px",
      border: "1px solid #e0e0e0",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      transition: props.hoverable ? "box-shadow 0.2s" : void 0
    }),
    "data-hoverable": props.hoverable ? "true" : void 0
  }),
  tagName: "div",
  renderChildren: true
});
var Input = createRemoteDOMComponent("Input", {
  mapProps: (props) => ({
    type: props.type || "text",
    value: props.value,
    defaultValue: props.defaultValue,
    placeholder: props.placeholder,
    disabled: props.disabled,
    readOnly: props.readOnly,
    required: props.required,
    autoFocus: props.autoFocus,
    maxLength: props.maxLength,
    pattern: props.pattern,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange,
    focus: props.onFocus,
    blur: props.onBlur
  }),
  tagName: "input",
  renderChildren: false
});
var TextArea = createRemoteDOMComponent("TextArea", {
  mapProps: (props) => ({
    value: props.value,
    defaultValue: props.defaultValue,
    placeholder: props.placeholder,
    disabled: props.disabled,
    readOnly: props.readOnly,
    required: props.required,
    rows: props.rows,
    cols: props.cols,
    maxLength: props.maxLength,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange
  }),
  tagName: "textarea",
  renderChildren: false
});
var Select = createRemoteDOMComponent("Select", {
  mapProps: (props) => ({
    value: props.value,
    defaultValue: props.defaultValue,
    disabled: props.disabled,
    required: props.required,
    multiple: props.multiple,
    size: props.size,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange
  }),
  tagName: "select",
  renderChildren: true
});
var Checkbox = createRemoteDOMComponent("Checkbox", {
  mapProps: (props) => ({
    type: "checkbox",
    checked: props.checked,
    defaultChecked: props.defaultChecked,
    disabled: props.disabled,
    required: props.required,
    value: props.value,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange
  }),
  tagName: "input",
  renderChildren: false
});
var Radio = createRemoteDOMComponent("Radio", {
  mapProps: (props) => ({
    type: "radio",
    checked: props.checked,
    defaultChecked: props.defaultChecked,
    disabled: props.disabled,
    required: props.required,
    value: props.value,
    name: props.name,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange
  }),
  tagName: "input",
  renderChildren: false
});
var Switch = createRemoteDOMComponent("Switch", {
  mapProps: (props) => ({
    type: "checkbox",
    role: "switch",
    checked: props.checked,
    defaultChecked: props.defaultChecked,
    disabled: props.disabled,
    class: props.className,
    style: serializeStyle(props.style),
    "data-switch": "true"
  }),
  mapEvents: (props) => ({
    change: props.onChange
  }),
  tagName: "input",
  renderChildren: false
});
var Slider = createRemoteDOMComponent("Slider", {
  mapProps: (props) => ({
    type: "range",
    value: props.value,
    defaultValue: props.defaultValue,
    min: props.min || 0,
    max: props.max || 100,
    step: props.step || 1,
    disabled: props.disabled,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange,
    input: props.onChange
  }),
  tagName: "input",
  renderChildren: false
});
var DatePicker = createRemoteDOMComponent("DatePicker", {
  mapProps: (props) => ({
    type: "date",
    value: props.value,
    defaultValue: props.defaultValue,
    min: props.min,
    max: props.max,
    disabled: props.disabled,
    required: props.required,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange
  }),
  tagName: "input",
  renderChildren: false
});
var TimePicker = createRemoteDOMComponent("TimePicker", {
  mapProps: (props) => ({
    type: "time",
    value: props.value,
    defaultValue: props.defaultValue,
    min: props.min,
    max: props.max,
    step: props.step,
    disabled: props.disabled,
    required: props.required,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange
  }),
  tagName: "input",
  renderChildren: false
});
var ColorPicker = createRemoteDOMComponent("ColorPicker", {
  mapProps: (props) => ({
    type: "color",
    value: props.value,
    defaultValue: props.defaultValue,
    disabled: props.disabled,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange
  }),
  tagName: "input",
  renderChildren: false
});
var FileUpload = createRemoteDOMComponent("FileUpload", {
  mapProps: (props) => ({
    type: "file",
    accept: props.accept,
    multiple: props.multiple,
    disabled: props.disabled,
    required: props.required,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    change: props.onChange
  }),
  tagName: "input",
  renderChildren: false
});
var FormGroup = createRemoteDOMComponent("FormGroup", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      marginBottom: "16px"
    })
  }),
  tagName: "div",
  renderChildren: true
});
var FormLabel = createRemoteDOMComponent("FormLabel", {
  mapProps: (props) => ({
    for: props.htmlFor,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "block",
      marginBottom: "4px",
      fontWeight: "500"
    }),
    "data-required": props.required ? "true" : void 0
  }),
  tagName: "label",
  renderChildren: true
});
var FormError = createRemoteDOMComponent("FormError", {
  mapProps: (props) => ({
    class: props.className,
    role: "alert",
    style: serializeStyle({
      ...props.style,
      color: "#d32f2f",
      fontSize: "0.875rem",
      marginTop: "4px"
    })
  }),
  tagName: "div",
  renderChildren: true
});
var FormHelper = createRemoteDOMComponent("FormHelper", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      color: "#757575",
      fontSize: "0.875rem",
      marginTop: "4px"
    })
  }),
  tagName: "div",
  renderChildren: true
});
var Button = createRemoteDOMComponent("Button", {
  mapProps: (props) => ({
    type: props.type || "button",
    disabled: props.disabled,
    class: props.className,
    style: serializeStyle(props.style),
    "data-variant": props.variant || "primary",
    "data-size": props.size || "medium"
  }),
  mapEvents: (props) => ({
    click: props.onClick
  }),
  tagName: "button",
  renderChildren: true
});
var IconButton = createRemoteDOMComponent("IconButton", {
  mapProps: (props) => ({
    type: "button",
    disabled: props.disabled,
    "aria-label": props.label,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      padding: props.size === "small" ? "4px" : props.size === "large" ? "12px" : "8px",
      borderRadius: "50%"
    }),
    "data-icon": props.icon,
    "data-size": props.size || "medium"
  }),
  mapEvents: (props) => ({
    click: props.onClick
  }),
  tagName: "button",
  renderChildren: true
});
var LinkButton = createRemoteDOMComponent("LinkButton", {
  mapProps: (props) => ({
    href: props.disabled ? void 0 : props.href,
    target: props.target,
    rel: props.target === "_blank" ? "noopener noreferrer" : props.rel,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      textDecoration: "none",
      cursor: props.disabled ? "not-allowed" : "pointer",
      opacity: props.disabled ? 0.5 : 1
    }),
    "data-disabled": props.disabled ? "true" : void 0
  }),
  mapEvents: (props) => ({
    click: props.onClick
  }),
  tagName: "a",
  renderChildren: true
});
var MenuButton = createRemoteDOMComponent("MenuButton", {
  mapProps: (props) => ({
    type: "button",
    disabled: props.disabled,
    "aria-haspopup": "true",
    "aria-expanded": props.expanded ? "true" : "false",
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    click: props.onClick
  }),
  tagName: "button",
  renderChildren: true
});
var ActionBar = createRemoteDOMComponent("ActionBar", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "flex",
      alignItems: "center",
      justifyContent: props.justify || "start",
      gap: props.gap || "8px"
    })
  }),
  tagName: "div",
  renderChildren: true
});
var ButtonGroup = createRemoteDOMComponent("ButtonGroup", {
  mapProps: (props) => ({
    role: "group",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "flex",
      flexDirection: props.orientation === "vertical" ? "column" : "row",
      gap: props.spacing || "0"
    })
  }),
  tagName: "div",
  renderChildren: true
});
var DropdownButton = createRemoteDOMComponent("DropdownButton", {
  mapProps: (props) => ({
    type: "button",
    disabled: props.disabled,
    "aria-haspopup": "menu",
    "aria-expanded": props.expanded ? "true" : "false",
    class: props.className,
    style: serializeStyle(props.style)
  }),
  mapEvents: (props) => ({
    click: props.onClick
  }),
  tagName: "button",
  renderChildren: true
});
var SplitButton = createRemoteDOMComponent("SplitButton", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "flex"
    }),
    "data-disabled": props.disabled ? "true" : void 0
  }),
  tagName: "div",
  renderChildren: true
});
var Text = createRemoteDOMComponent("Text", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      fontSize: props.size === "small" ? "0.875rem" : props.size === "large" ? "1.125rem" : "1rem",
      fontWeight: props.weight === "medium" ? "500" : props.weight === "bold" ? "700" : "400",
      color: props.color,
      textAlign: props.align
    })
  }),
  tagName: "span",
  renderChildren: true
});
var Heading = createRemoteDOMComponent("Heading", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      color: props.color,
      textAlign: props.align
    }),
    "data-level": props.level || 2
  }),
  tagName: "h2",
  renderChildren: true
});
var Link = createRemoteDOMComponent("Link", {
  mapProps: (props) => ({
    href: props.href,
    target: props.target,
    rel: props.target === "_blank" ? "noopener noreferrer" : props.rel,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      textDecoration: props.underline ? "underline" : "none"
    })
  }),
  mapEvents: (props) => ({
    click: props.onClick
  }),
  tagName: "a",
  renderChildren: true
});
var Badge = createRemoteDOMComponent("Badge", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "inline-block",
      padding: props.size === "small" ? "2px 6px" : "4px 8px",
      fontSize: props.size === "small" ? "0.75rem" : "0.875rem",
      borderRadius: "4px"
    }),
    "data-variant": props.variant || "default"
  }),
  tagName: "span",
  renderChildren: true
});
var Tag = createRemoteDOMComponent("Tag", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 8px",
      borderRadius: "4px",
      border: "1px solid #e0e0e0"
    }),
    "data-closable": props.closable ? "true" : void 0
  }),
  tagName: "span",
  renderChildren: true
});
var Chip = createRemoteDOMComponent("Chip", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: props.size === "small" ? "4px 8px" : "6px 12px",
      borderRadius: "16px",
      border: props.variant === "outlined" ? "1px solid currentColor" : "none"
    }),
    "data-variant": props.variant || "filled",
    "data-deletable": props.deletable ? "true" : void 0
  }),
  mapEvents: (props) => ({
    click: props.onClick
  }),
  tagName: "div",
  renderChildren: true
});
var Avatar = createRemoteDOMComponent("Avatar", {
  mapProps: (props) => ({
    src: props.src,
    alt: props.alt || "Avatar",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      width: props.size === "small" ? "32px" : props.size === "large" ? "64px" : "48px",
      height: props.size === "small" ? "32px" : props.size === "large" ? "64px" : "48px",
      borderRadius: props.shape === "square" ? "4px" : "50%",
      objectFit: "cover"
    })
  }),
  tagName: "img",
  renderChildren: false
});
var Icon = createRemoteDOMComponent("Icon", {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      fontSize: typeof props.size === "number" ? `${props.size}px` : props.size,
      color: props.color,
      display: "inline-block"
    }),
    "data-icon": props.name,
    "aria-hidden": "true"
  }),
  tagName: "span",
  renderChildren: true
});
var Image = createRemoteDOMComponent("Image", {
  mapProps: (props) => ({
    src: props.src,
    alt: props.alt,
    width: props.width,
    height: props.height,
    loading: props.loading,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      objectFit: props.objectFit
    })
  }),
  tagName: "img",
  renderChildren: false
});
var Video = createRemoteDOMComponent("Video", {
  mapProps: (props) => ({
    src: props.src,
    controls: props.controls,
    autoPlay: props.autoPlay,
    loop: props.loop,
    muted: props.muted,
    width: props.width,
    height: props.height,
    poster: props.poster,
    class: props.className,
    style: serializeStyle(props.style)
  }),
  tagName: "video",
  renderChildren: true
});
var Alert = createRemoteDOMComponent("Alert", {
  mapProps: (props) => ({
    role: "alert",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      padding: "12px 16px",
      borderRadius: "4px"
    }),
    "data-severity": props.severity || "info",
    "data-variant": props.variant || "standard"
  }),
  tagName: "div",
  renderChildren: true
});
var Toast = createRemoteDOMComponent("Toast", {
  mapProps: (props) => ({
    role: "status",
    "aria-live": "polite",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: "fixed",
      padding: "12px 16px",
      borderRadius: "4px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
    }),
    "data-position": props.position || "bottom-center",
    "data-duration": props.duration
  }),
  tagName: "div",
  renderChildren: true
});
var Modal = createRemoteDOMComponent("Modal", {
  mapProps: (props) => ({
    role: "dialog",
    "aria-modal": "true",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      padding: "24px",
      zIndex: 1e3,
      display: props.open ? "block" : "none"
    }),
    "data-open": props.open ? "true" : "false"
  }),
  tagName: "div",
  renderChildren: true
});
var Popover = createRemoteDOMComponent("Popover", {
  mapProps: (props) => ({
    role: "dialog",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: "absolute",
      backgroundColor: "white",
      border: "1px solid #e0e0e0",
      borderRadius: "4px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      padding: "8px",
      display: props.open ? "block" : "none",
      zIndex: 1e3
    }),
    "data-open": props.open ? "true" : "false",
    "data-anchor": props.anchorEl
  }),
  tagName: "div",
  renderChildren: true
});
var Tooltip = createRemoteDOMComponent("Tooltip", {
  mapProps: (props) => ({
    role: "tooltip",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: "absolute",
      backgroundColor: "#333",
      color: "white",
      padding: "6px 8px",
      borderRadius: "4px",
      fontSize: "0.875rem",
      whiteSpace: "nowrap",
      zIndex: 1500
    }),
    "data-placement": props.placement || "top"
  }),
  tagName: "div",
  renderChildren: true
});
var ProgressBar = createRemoteDOMComponent("ProgressBar", {
  mapProps: (props) => ({
    role: "progressbar",
    "aria-valuenow": props.value,
    "aria-valuemin": 0,
    "aria-valuemax": props.max || 100,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      width: "100%",
      height: props.size === "small" ? "4px" : props.size === "large" ? "12px" : "8px",
      backgroundColor: "#e0e0e0",
      borderRadius: "4px",
      overflow: "hidden"
    }),
    "data-variant": props.variant || "determinate"
  }),
  tagName: "div",
  renderChildren: true
});
var Spinner = createRemoteDOMComponent("Spinner", {
  mapProps: (props) => ({
    role: "status",
    "aria-label": "Loading",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      width: props.size === "small" ? "16px" : props.size === "large" ? "48px" : "32px",
      height: props.size === "small" ? "16px" : props.size === "large" ? "48px" : "32px",
      border: "2px solid #e0e0e0",
      borderTopColor: props.color || "#1976d2",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    }),
    "data-size": props.size || "medium"
  }),
  tagName: "div",
  renderChildren: false
});
var Skeleton = createRemoteDOMComponent("Skeleton", {
  mapProps: (props) => ({
    "aria-busy": "true",
    "aria-label": "Loading",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      backgroundColor: "#e0e0e0",
      width: props.width,
      height: props.height || (props.variant === "text" ? "1em" : "128px"),
      borderRadius: props.variant === "circular" ? "50%" : props.variant === "text" ? "4px" : "8px"
    }),
    "data-variant": props.variant || "rectangular",
    "data-animation": props.animation || "pulse"
  }),
  tagName: "div",
  renderChildren: false
});
var Tabs = createRemoteDOMComponent("Tabs", {
  mapProps: (props) => ({
    role: "tablist",
    "aria-orientation": props.orientation || "horizontal",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "flex",
      flexDirection: props.orientation === "vertical" ? "column" : "row",
      borderBottom: props.orientation === "vertical" ? "none" : "1px solid #e0e0e0",
      borderRight: props.orientation === "vertical" ? "1px solid #e0e0e0" : "none"
    }),
    "data-value": props.value
  }),
  tagName: "div",
  renderChildren: true
});
var Breadcrumbs = createRemoteDOMComponent("Breadcrumbs", {
  mapProps: (props) => ({
    "aria-label": "Breadcrumb",
    role: "navigation",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "flex",
      alignItems: "center",
      gap: "8px"
    }),
    "data-separator": props.separator || "/"
  }),
  tagName: "nav",
  renderChildren: true
});
var Pagination = createRemoteDOMComponent("Pagination", {
  mapProps: (props) => ({
    role: "navigation",
    "aria-label": "Pagination",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: "flex",
      alignItems: "center",
      gap: "4px"
    }),
    "data-count": props.count,
    "data-page": props.page,
    "data-size": props.size || "medium"
  }),
  tagName: "nav",
  renderChildren: true
});
var Menu = createRemoteDOMComponent("Menu", {
  mapProps: (props) => ({
    role: "menu",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: "absolute",
      backgroundColor: "white",
      border: "1px solid #e0e0e0",
      borderRadius: "4px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      minWidth: "160px",
      padding: "4px 0",
      display: props.open ? "block" : "none",
      zIndex: 1300
    }),
    "data-open": props.open ? "true" : "false",
    "data-anchor": props.anchorEl
  }),
  tagName: "div",
  renderChildren: true
});
var Drawer = createRemoteDOMComponent("Drawer", {
  mapProps: (props) => ({
    role: "dialog",
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: "fixed",
      backgroundColor: "white",
      boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
      zIndex: 1200,
      transition: "transform 0.3s",
      ...props.anchor === "left" && { left: 0, top: 0, bottom: 0, width: "280px" },
      ...props.anchor === "right" && { right: 0, top: 0, bottom: 0, width: "280px" },
      ...props.anchor === "top" && { top: 0, left: 0, right: 0, height: "280px" },
      ...props.anchor === "bottom" && { bottom: 0, left: 0, right: 0, height: "280px" },
      transform: props.open ? "none" : props.anchor === "left" ? "translateX(-100%)" : props.anchor === "right" ? "translateX(100%)" : props.anchor === "top" ? "translateY(-100%)" : "translateY(100%)"
    }),
    "data-open": props.open ? "true" : "false",
    "data-anchor": props.anchor || "left",
    "data-variant": props.variant || "temporary"
  }),
  tagName: "aside",
  renderChildren: true
});
var ALL_COMPONENTS = {
  // Layout
  Container,
  Row,
  Column,
  Grid,
  Stack,
  Spacer,
  Divider,
  Section,
  Panel,
  Card,
  // Form
  Input,
  TextArea,
  Select,
  Checkbox,
  Radio,
  Switch,
  Slider,
  DatePicker,
  TimePicker,
  ColorPicker,
  FileUpload,
  FormGroup,
  FormLabel,
  FormError,
  FormHelper,
  // Action
  Button,
  IconButton,
  LinkButton,
  MenuButton,
  ActionBar,
  ButtonGroup,
  DropdownButton,
  SplitButton,
  // Display
  Text,
  Heading,
  Link,
  Badge,
  Tag,
  Chip,
  Avatar,
  Icon,
  Image,
  Video,
  // Feedback
  Alert,
  Toast,
  Modal,
  Popover,
  Tooltip,
  ProgressBar,
  Spinner,
  Skeleton,
  // Navigation
  Tabs,
  Breadcrumbs,
  Pagination,
  Menu,
  Drawer
};
var COMPONENT_COUNTS = {
  Layout: 10,
  Form: 15,
  Action: 8,
  Display: 10,
  Feedback: 8,
  Navigation: 5,
  Total: 56
};
export {
  ALL_COMPONENTS,
  ActionBar,
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  ButtonGroup,
  COMPONENT_COUNTS,
  Card,
  Checkbox,
  Chip,
  ColorPicker,
  Column,
  Container,
  DatePicker,
  Divider,
  Drawer,
  DropdownButton,
  FileUpload,
  FormError,
  FormGroup,
  FormHelper,
  FormLabel,
  Grid,
  Heading,
  Icon,
  IconButton,
  Image,
  Input,
  Link,
  LinkButton,
  Menu,
  MenuButton,
  Modal,
  Pagination,
  Panel,
  Popover,
  ProgressBar,
  Radio,
  RemoteDOMProvider,
  Row,
  Section,
  Select,
  Skeleton,
  Slider,
  Spacer,
  Spinner,
  SplitButton,
  Stack,
  Switch,
  Tabs,
  Tag,
  Text,
  TextArea,
  TimePicker,
  Toast,
  Tooltip,
  Video,
  createRemoteDOMComponent,
  serializeEventListener,
  serializeStyle
};
//# sourceMappingURL=component-library-v2.js.map
