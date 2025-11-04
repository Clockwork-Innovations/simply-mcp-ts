/**
 * Remote DOM Component Library v2
 *
 * Comprehensive component library for Remote DOM with 50+ components.
 * Built using factory pattern for consistent API and Remote DOM integration.
 *
 * This is the FEATURE LAYER implementation building on Phase 1 foundation.
 *
 * Component Categories:
 * - Layout (10): Container, Row, Column, Grid, Stack, Spacer, Divider, Section, Panel, Card
 * - Form (15): Input, TextArea, Select, Checkbox, Radio, Switch, Slider, DatePicker, etc.
 * - Action (8): Button, IconButton, LinkButton, MenuButton, ActionBar, etc.
 * - Display (10): Text, Heading, Link, Badge, Tag, Chip, Avatar, Icon, Image, Video
 * - Feedback (8): Alert, Toast, Modal, Popover, Tooltip, ProgressBar, Spinner, Skeleton
 * - Navigation (5): Tabs, Breadcrumbs, Pagination, Menu, Drawer
 *
 * @module client/remote-dom/component-library-v2
 */

import React, { useEffect, useCallback } from 'react';
import {
  useRemoteDOMContext,
  useRemoteDOMNodeId,
  useRemoteDOMManager,
} from './RemoteDOMContext.js';
import type { RemoteDOMOperation } from './types.js';

/**
 * Component Props Base
 *
 * Base props for all Remote DOM components.
 */
export interface RemoteDOMComponentProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

/**
 * Component Factory Config
 *
 * Configuration for creating Remote DOM component factories.
 */
export interface ComponentFactoryConfig<P extends RemoteDOMComponentProps> {
  /**
   * Map props to attributes for the DOM element
   */
  mapProps: (props: P) => Record<string, any>;

  /**
   * Map props to event handlers
   */
  mapEvents?: (props: P) => Record<string, any>;

  /**
   * HTML tag name to render
   */
  tagName: string;

  /**
   * Whether to render children
   */
  renderChildren?: boolean;
}

/**
 * Serialize Style Object
 *
 * Converts React CSSProperties object to CSS string.
 *
 * @param style - React CSS properties
 * @returns CSS string
 *
 * @example
 * ```typescript
 * serializeStyle({ color: 'blue', fontSize: 16 })
 * // Returns: "color: blue; font-size: 16px"
 * ```
 */
export function serializeStyle(style?: React.CSSProperties): string {
  if (!style) return '';

  return Object.entries(style)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();

      // Add px unit to numeric values for size properties
      const numericSizeProps = [
        'width', 'height', 'top', 'right', 'bottom', 'left',
        'margin', 'padding', 'font-size', 'line-height',
        'border-width', 'border-radius'
      ];

      let cssValue = value;
      if (typeof value === 'number' && numericSizeProps.some(prop => cssKey.includes(prop))) {
        cssValue = `${value}px`;
      }

      return `${cssKey}: ${cssValue}`;
    })
    .join('; ');
}

/**
 * Serialize Event Listener
 *
 * Converts event handler function to serializable string.
 * In production, this would use a more sophisticated event handling system.
 *
 * @param handler - Event handler function
 * @returns Serialized handler identifier
 */
export function serializeEventListener(handler: Function): string {
  // For now, return a simple identifier
  // In production, this would register the handler in a registry
  return `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create Remote DOM Component Factory
 *
 * Factory function for creating Remote DOM components with consistent API.
 *
 * @param displayName - Component display name for debugging
 * @param config - Component configuration
 * @returns React functional component
 *
 * @example
 * ```typescript
 * const Button = createRemoteDOMComponent<ButtonProps>('Button', {
 *   mapProps: (props) => ({
 *     disabled: props.disabled,
 *     type: props.type || 'button',
 *     'data-variant': props.variant,
 *   }),
 *   mapEvents: (props) => ({
 *     click: props.onClick,
 *   }),
 *   tagName: 'button',
 *   renderChildren: true,
 * });
 * ```
 */
export function createRemoteDOMComponent<P extends RemoteDOMComponentProps>(
  displayName: string,
  config: ComponentFactoryConfig<P>
): React.FC<P> {
  const Component: React.FC<P> = (props) => {
    const nodeId = useRemoteDOMNodeId();
    const { sendOperation, registerEventHandler, unregisterEventHandler } = useRemoteDOMContext();

    useEffect(() => {
      // Create element
      sendOperation({
        type: 'createElement',
        nodeId,
        tagName: config.tagName,
      });

      // Set attributes
      const attributes = config.mapProps(props);
      for (const [name, value] of Object.entries(attributes)) {
        if (value !== undefined && value !== null) {
          sendOperation({
            type: 'setAttribute',
            nodeId,
            attributeName: name,
            attributeValue: String(value),
          });
        }
      }

      // Add event listeners
      const handlerIds: string[] = [];
      if (config.mapEvents) {
        const events = config.mapEvents(props);
        for (const [eventType, handler] of Object.entries(events)) {
          if (handler && typeof handler === 'function') {
            const handlerId = registerEventHandler(nodeId, eventType, handler);
            handlerIds.push(handlerId);

            sendOperation({
              type: 'addEventListener',
              nodeId,
              eventType,
              eventListener: handlerId,
            });
          }
        }
      }

      // Cleanup on unmount
      return () => {
        // Remove event handlers
        handlerIds.forEach((handlerId) => {
          unregisterEventHandler(handlerId);
        });

        // Remove element
        sendOperation({
          type: 'removeChild',
          childId: nodeId,
        });
      };
    }, [nodeId, sendOperation, registerEventHandler, unregisterEventHandler, props]);

    // Render children if configured
    if (config.renderChildren && props.children) {
      return <>{props.children}</>;
    }

    return null;
  };

  Component.displayName = displayName;
  return Component;
}

// =============================================================================
// LAYOUT COMPONENTS (10)
// =============================================================================

export interface ContainerProps extends RemoteDOMComponentProps {
  maxWidth?: string;
  padding?: string;
}

export const Container = createRemoteDOMComponent<ContainerProps>('Container', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      maxWidth: props.maxWidth,
      padding: props.padding,
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface RowProps extends RemoteDOMComponentProps {
  gap?: string;
  align?: 'start' | 'center' | 'end';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

export const Row = createRemoteDOMComponent<RowProps>('Row', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'flex',
      flexDirection: 'row',
      gap: props.gap,
      alignItems: props.align,
      justifyContent: props.justify,
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface ColumnProps extends RemoteDOMComponentProps {
  gap?: string;
  align?: 'start' | 'center' | 'end' | 'stretch';
}

export const Column = createRemoteDOMComponent<ColumnProps>('Column', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'flex',
      flexDirection: 'column',
      gap: props.gap,
      alignItems: props.align,
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface GridProps extends RemoteDOMComponentProps {
  columns?: number | string;
  gap?: string;
  rowGap?: string;
  columnGap?: string;
}

export const Grid = createRemoteDOMComponent<GridProps>('Grid', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'grid',
      gridTemplateColumns: typeof props.columns === 'number'
        ? `repeat(${props.columns}, 1fr)`
        : props.columns,
      gap: props.gap,
      rowGap: props.rowGap,
      columnGap: props.columnGap,
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface StackProps extends RemoteDOMComponentProps {
  direction?: 'vertical' | 'horizontal';
  gap?: string;
  align?: 'start' | 'center' | 'end' | 'stretch';
}

export const Stack = createRemoteDOMComponent<StackProps>('Stack', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'flex',
      flexDirection: props.direction === 'horizontal' ? 'row' : 'column',
      gap: props.gap || '8px',
      alignItems: props.align,
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface SpacerProps extends RemoteDOMComponentProps {
  size?: string;
}

export const Spacer = createRemoteDOMComponent<SpacerProps>('Spacer', {
  mapProps: (props) => ({
    style: serializeStyle({
      ...props.style,
      width: props.size || '8px',
      height: props.size || '8px',
    }),
  }),
  tagName: 'div',
  renderChildren: false,
});

export interface DividerProps extends RemoteDOMComponentProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: string;
  color?: string;
}

export const Divider = createRemoteDOMComponent<DividerProps>('Divider', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      width: props.orientation === 'vertical' ? (props.thickness || '1px') : '100%',
      height: props.orientation === 'vertical' ? '100%' : (props.thickness || '1px'),
      backgroundColor: props.color || '#e0e0e0',
    }),
  }),
  tagName: 'hr',
  renderChildren: false,
});

export const Section = createRemoteDOMComponent<RemoteDOMComponentProps>('Section', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle(props.style),
  }),
  tagName: 'section',
  renderChildren: true,
});

export interface PanelProps extends RemoteDOMComponentProps {
  padding?: string;
  bordered?: boolean;
  shadow?: boolean;
}

export const Panel = createRemoteDOMComponent<PanelProps>('Panel', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      padding: props.padding || '16px',
      border: props.bordered ? '1px solid #e0e0e0' : 'none',
      boxShadow: props.shadow ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface CardProps extends RemoteDOMComponentProps {
  padding?: string;
  hoverable?: boolean;
}

export const Card = createRemoteDOMComponent<CardProps>('Card', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      padding: props.padding || '16px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: props.hoverable ? 'box-shadow 0.2s' : undefined,
    }),
    'data-hoverable': props.hoverable ? 'true' : undefined,
  }),
  tagName: 'div',
  renderChildren: true,
});

// =============================================================================
// FORM COMPONENTS (15)
// =============================================================================

export interface InputProps extends RemoteDOMComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  pattern?: string;
  onChange?: (event: Event) => void;
  onFocus?: (event: Event) => void;
  onBlur?: (event: Event) => void;
}

export const Input = createRemoteDOMComponent<InputProps>('Input', {
  mapProps: (props) => ({
    type: props.type || 'text',
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
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
    focus: props.onFocus,
    blur: props.onBlur,
  }),
  tagName: 'input',
  renderChildren: false,
});

export interface TextAreaProps extends RemoteDOMComponentProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  rows?: number;
  cols?: number;
  maxLength?: number;
  onChange?: (event: Event) => void;
}

export const TextArea = createRemoteDOMComponent<TextAreaProps>('TextArea', {
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
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
  }),
  tagName: 'textarea',
  renderChildren: false,
});

export interface SelectProps extends RemoteDOMComponentProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  multiple?: boolean;
  size?: number;
  onChange?: (event: Event) => void;
}

export const Select = createRemoteDOMComponent<SelectProps>('Select', {
  mapProps: (props) => ({
    value: props.value,
    defaultValue: props.defaultValue,
    disabled: props.disabled,
    required: props.required,
    multiple: props.multiple,
    size: props.size,
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
  }),
  tagName: 'select',
  renderChildren: true,
});

export interface CheckboxProps extends RemoteDOMComponentProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  value?: string;
  onChange?: (event: Event) => void;
}

export const Checkbox = createRemoteDOMComponent<CheckboxProps>('Checkbox', {
  mapProps: (props) => ({
    type: 'checkbox',
    checked: props.checked,
    defaultChecked: props.defaultChecked,
    disabled: props.disabled,
    required: props.required,
    value: props.value,
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
  }),
  tagName: 'input',
  renderChildren: false,
});

export interface RadioProps extends RemoteDOMComponentProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  value?: string;
  name?: string;
  onChange?: (event: Event) => void;
}

export const Radio = createRemoteDOMComponent<RadioProps>('Radio', {
  mapProps: (props) => ({
    type: 'radio',
    checked: props.checked,
    defaultChecked: props.defaultChecked,
    disabled: props.disabled,
    required: props.required,
    value: props.value,
    name: props.name,
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
  }),
  tagName: 'input',
  renderChildren: false,
});

export interface SwitchProps extends RemoteDOMComponentProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (event: Event) => void;
}

export const Switch = createRemoteDOMComponent<SwitchProps>('Switch', {
  mapProps: (props) => ({
    type: 'checkbox',
    role: 'switch',
    checked: props.checked,
    defaultChecked: props.defaultChecked,
    disabled: props.disabled,
    class: props.className,
    style: serializeStyle(props.style),
    'data-switch': 'true',
  }),
  mapEvents: (props) => ({
    change: props.onChange,
  }),
  tagName: 'input',
  renderChildren: false,
});

export interface SliderProps extends RemoteDOMComponentProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange?: (event: Event) => void;
}

export const Slider = createRemoteDOMComponent<SliderProps>('Slider', {
  mapProps: (props) => ({
    type: 'range',
    value: props.value,
    defaultValue: props.defaultValue,
    min: props.min || 0,
    max: props.max || 100,
    step: props.step || 1,
    disabled: props.disabled,
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
    input: props.onChange,
  }),
  tagName: 'input',
  renderChildren: false,
});

export interface DatePickerProps extends RemoteDOMComponentProps {
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (event: Event) => void;
}

export const DatePicker = createRemoteDOMComponent<DatePickerProps>('DatePicker', {
  mapProps: (props) => ({
    type: 'date',
    value: props.value,
    defaultValue: props.defaultValue,
    min: props.min,
    max: props.max,
    disabled: props.disabled,
    required: props.required,
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
  }),
  tagName: 'input',
  renderChildren: false,
});

export interface TimePickerProps extends RemoteDOMComponentProps {
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  onChange?: (event: Event) => void;
}

export const TimePicker = createRemoteDOMComponent<TimePickerProps>('TimePicker', {
  mapProps: (props) => ({
    type: 'time',
    value: props.value,
    defaultValue: props.defaultValue,
    min: props.min,
    max: props.max,
    step: props.step,
    disabled: props.disabled,
    required: props.required,
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
  }),
  tagName: 'input',
  renderChildren: false,
});

export interface ColorPickerProps extends RemoteDOMComponentProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onChange?: (event: Event) => void;
}

export const ColorPicker = createRemoteDOMComponent<ColorPickerProps>('ColorPicker', {
  mapProps: (props) => ({
    type: 'color',
    value: props.value,
    defaultValue: props.defaultValue,
    disabled: props.disabled,
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
  }),
  tagName: 'input',
  renderChildren: false,
});

export interface FileUploadProps extends RemoteDOMComponentProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
  onChange?: (event: Event) => void;
}

export const FileUpload = createRemoteDOMComponent<FileUploadProps>('FileUpload', {
  mapProps: (props) => ({
    type: 'file',
    accept: props.accept,
    multiple: props.multiple,
    disabled: props.disabled,
    required: props.required,
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    change: props.onChange,
  }),
  tagName: 'input',
  renderChildren: false,
});

export const FormGroup = createRemoteDOMComponent<RemoteDOMComponentProps>('FormGroup', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      marginBottom: '16px',
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface FormLabelProps extends RemoteDOMComponentProps {
  htmlFor?: string;
  required?: boolean;
}

export const FormLabel = createRemoteDOMComponent<FormLabelProps>('FormLabel', {
  mapProps: (props) => ({
    for: props.htmlFor,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'block',
      marginBottom: '4px',
      fontWeight: '500',
    }),
    'data-required': props.required ? 'true' : undefined,
  }),
  tagName: 'label',
  renderChildren: true,
});

export const FormError = createRemoteDOMComponent<RemoteDOMComponentProps>('FormError', {
  mapProps: (props) => ({
    class: props.className,
    role: 'alert',
    style: serializeStyle({
      ...props.style,
      color: '#d32f2f',
      fontSize: '0.875rem',
      marginTop: '4px',
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export const FormHelper = createRemoteDOMComponent<RemoteDOMComponentProps>('FormHelper', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      color: '#757575',
      fontSize: '0.875rem',
      marginTop: '4px',
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

// =============================================================================
// ACTION COMPONENTS (8)
// =============================================================================

export interface ButtonProps extends RemoteDOMComponentProps {
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export const Button = createRemoteDOMComponent<ButtonProps>('Button', {
  mapProps: (props) => ({
    type: props.type || 'button',
    disabled: props.disabled,
    class: props.className,
    style: serializeStyle(props.style),
    'data-variant': props.variant || 'primary',
    'data-size': props.size || 'medium',
  }),
  mapEvents: (props) => ({
    click: props.onClick,
  }),
  tagName: 'button',
  renderChildren: true,
});

export interface IconButtonProps extends RemoteDOMComponentProps {
  icon?: string;
  label?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export const IconButton = createRemoteDOMComponent<IconButtonProps>('IconButton', {
  mapProps: (props) => ({
    type: 'button',
    disabled: props.disabled,
    'aria-label': props.label,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      padding: props.size === 'small' ? '4px' : props.size === 'large' ? '12px' : '8px',
      borderRadius: '50%',
    }),
    'data-icon': props.icon,
    'data-size': props.size || 'medium',
  }),
  mapEvents: (props) => ({
    click: props.onClick,
  }),
  tagName: 'button',
  renderChildren: true,
});

export interface LinkButtonProps extends RemoteDOMComponentProps {
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export const LinkButton = createRemoteDOMComponent<LinkButtonProps>('LinkButton', {
  mapProps: (props) => ({
    href: props.disabled ? undefined : props.href,
    target: props.target,
    rel: props.target === '_blank' ? 'noopener noreferrer' : props.rel,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      textDecoration: 'none',
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      opacity: props.disabled ? 0.5 : 1,
    }),
    'data-disabled': props.disabled ? 'true' : undefined,
  }),
  mapEvents: (props) => ({
    click: props.onClick,
  }),
  tagName: 'a',
  renderChildren: true,
});

export interface MenuButtonProps extends RemoteDOMComponentProps {
  disabled?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}

export const MenuButton = createRemoteDOMComponent<MenuButtonProps>('MenuButton', {
  mapProps: (props) => ({
    type: 'button',
    disabled: props.disabled,
    'aria-haspopup': 'true',
    'aria-expanded': props.expanded ? 'true' : 'false',
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    click: props.onClick,
  }),
  tagName: 'button',
  renderChildren: true,
});

export interface ActionBarProps extends RemoteDOMComponentProps {
  justify?: 'start' | 'end' | 'center' | 'between';
  gap?: string;
}

export const ActionBar = createRemoteDOMComponent<ActionBarProps>('ActionBar', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'flex',
      alignItems: 'center',
      justifyContent: props.justify || 'start',
      gap: props.gap || '8px',
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface ButtonGroupProps extends RemoteDOMComponentProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: string;
}

export const ButtonGroup = createRemoteDOMComponent<ButtonGroupProps>('ButtonGroup', {
  mapProps: (props) => ({
    role: 'group',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'flex',
      flexDirection: props.orientation === 'vertical' ? 'column' : 'row',
      gap: props.spacing || '0',
    }),
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface DropdownButtonProps extends RemoteDOMComponentProps {
  disabled?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}

export const DropdownButton = createRemoteDOMComponent<DropdownButtonProps>('DropdownButton', {
  mapProps: (props) => ({
    type: 'button',
    disabled: props.disabled,
    'aria-haspopup': 'menu',
    'aria-expanded': props.expanded ? 'true' : 'false',
    class: props.className,
    style: serializeStyle(props.style),
  }),
  mapEvents: (props) => ({
    click: props.onClick,
  }),
  tagName: 'button',
  renderChildren: true,
});

export interface SplitButtonProps extends RemoteDOMComponentProps {
  disabled?: boolean;
  onPrimaryClick?: () => void;
  onMenuClick?: () => void;
}

export const SplitButton = createRemoteDOMComponent<SplitButtonProps>('SplitButton', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'flex',
    }),
    'data-disabled': props.disabled ? 'true' : undefined,
  }),
  tagName: 'div',
  renderChildren: true,
});

// =============================================================================
// DISPLAY COMPONENTS (10)
// =============================================================================

export interface TextProps extends RemoteDOMComponentProps {
  size?: 'small' | 'medium' | 'large';
  weight?: 'normal' | 'medium' | 'bold';
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export const Text = createRemoteDOMComponent<TextProps>('Text', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      fontSize: props.size === 'small' ? '0.875rem' : props.size === 'large' ? '1.125rem' : '1rem',
      fontWeight: props.weight === 'medium' ? '500' : props.weight === 'bold' ? '700' : '400',
      color: props.color,
      textAlign: props.align,
    }),
  }),
  tagName: 'span',
  renderChildren: true,
});

export interface HeadingProps extends RemoteDOMComponentProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

// Note: Heading uses h2 as default tagName since factory doesn't support dynamic tagName
// In production, this would need a custom implementation to support level prop
export const Heading = createRemoteDOMComponent<HeadingProps>('Heading', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      color: props.color,
      textAlign: props.align,
    }),
    'data-level': props.level || 2,
  }),
  tagName: 'h2',
  renderChildren: true,
});

export interface LinkProps extends RemoteDOMComponentProps {
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
  underline?: boolean;
  onClick?: () => void;
}

export const Link = createRemoteDOMComponent<LinkProps>('Link', {
  mapProps: (props) => ({
    href: props.href,
    target: props.target,
    rel: props.target === '_blank' ? 'noopener noreferrer' : props.rel,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      textDecoration: props.underline ? 'underline' : 'none',
    }),
  }),
  mapEvents: (props) => ({
    click: props.onClick,
  }),
  tagName: 'a',
  renderChildren: true,
});

export interface BadgeProps extends RemoteDOMComponentProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium';
}

export const Badge = createRemoteDOMComponent<BadgeProps>('Badge', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'inline-block',
      padding: props.size === 'small' ? '2px 6px' : '4px 8px',
      fontSize: props.size === 'small' ? '0.75rem' : '0.875rem',
      borderRadius: '4px',
    }),
    'data-variant': props.variant || 'default',
  }),
  tagName: 'span',
  renderChildren: true,
});

export interface TagProps extends RemoteDOMComponentProps {
  closable?: boolean;
  onClose?: () => void;
}

export const Tag = createRemoteDOMComponent<TagProps>('Tag', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '4px',
      border: '1px solid #e0e0e0',
    }),
    'data-closable': props.closable ? 'true' : undefined,
  }),
  tagName: 'span',
  renderChildren: true,
});

export interface ChipProps extends RemoteDOMComponentProps {
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium';
  deletable?: boolean;
  onDelete?: () => void;
  onClick?: () => void;
}

export const Chip = createRemoteDOMComponent<ChipProps>('Chip', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: props.size === 'small' ? '4px 8px' : '6px 12px',
      borderRadius: '16px',
      border: props.variant === 'outlined' ? '1px solid currentColor' : 'none',
    }),
    'data-variant': props.variant || 'filled',
    'data-deletable': props.deletable ? 'true' : undefined,
  }),
  mapEvents: (props) => ({
    click: props.onClick,
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface AvatarProps extends RemoteDOMComponentProps {
  src?: string;
  alt?: string;
  size?: 'small' | 'medium' | 'large';
  shape?: 'circle' | 'square';
}

export const Avatar = createRemoteDOMComponent<AvatarProps>('Avatar', {
  mapProps: (props) => ({
    src: props.src,
    alt: props.alt || 'Avatar',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      width: props.size === 'small' ? '32px' : props.size === 'large' ? '64px' : '48px',
      height: props.size === 'small' ? '32px' : props.size === 'large' ? '64px' : '48px',
      borderRadius: props.shape === 'square' ? '4px' : '50%',
      objectFit: 'cover',
    }),
  }),
  tagName: 'img',
  renderChildren: false,
});

export interface IconProps extends RemoteDOMComponentProps {
  name?: string;
  size?: number | string;
  color?: string;
}

export const Icon = createRemoteDOMComponent<IconProps>('Icon', {
  mapProps: (props) => ({
    class: props.className,
    style: serializeStyle({
      ...props.style,
      fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size,
      color: props.color,
      display: 'inline-block',
    }),
    'data-icon': props.name,
    'aria-hidden': 'true',
  }),
  tagName: 'span',
  renderChildren: true,
});

export interface ImageProps extends RemoteDOMComponentProps {
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export const Image = createRemoteDOMComponent<ImageProps>('Image', {
  mapProps: (props) => ({
    src: props.src,
    alt: props.alt,
    width: props.width,
    height: props.height,
    loading: props.loading,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      objectFit: props.objectFit,
    }),
  }),
  tagName: 'img',
  renderChildren: false,
});

export interface VideoProps extends RemoteDOMComponentProps {
  src?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: number | string;
  height?: number | string;
  poster?: string;
}

export const Video = createRemoteDOMComponent<VideoProps>('Video', {
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
    style: serializeStyle(props.style),
  }),
  tagName: 'video',
  renderChildren: true,
});

// =============================================================================
// FEEDBACK COMPONENTS (8)
// =============================================================================

export interface AlertProps extends RemoteDOMComponentProps {
  severity?: 'info' | 'success' | 'warning' | 'error';
  variant?: 'filled' | 'outlined' | 'standard';
  closable?: boolean;
  onClose?: () => void;
}

export const Alert = createRemoteDOMComponent<AlertProps>('Alert', {
  mapProps: (props) => ({
    role: 'alert',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      padding: '12px 16px',
      borderRadius: '4px',
    }),
    'data-severity': props.severity || 'info',
    'data-variant': props.variant || 'standard',
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface ToastProps extends RemoteDOMComponentProps {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  onClose?: () => void;
}

export const Toast = createRemoteDOMComponent<ToastProps>('Toast', {
  mapProps: (props) => ({
    role: 'status',
    'aria-live': 'polite',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: 'fixed',
      padding: '12px 16px',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }),
    'data-position': props.position || 'bottom-center',
    'data-duration': props.duration,
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface ModalProps extends RemoteDOMComponentProps {
  open?: boolean;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
}

export const Modal = createRemoteDOMComponent<ModalProps>('Modal', {
  mapProps: (props) => ({
    role: 'dialog',
    'aria-modal': 'true',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      padding: '24px',
      zIndex: 1000,
      display: props.open ? 'block' : 'none',
    }),
    'data-open': props.open ? 'true' : 'false',
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface PopoverProps extends RemoteDOMComponentProps {
  open?: boolean;
  anchorEl?: string;
  onClose?: () => void;
}

export const Popover = createRemoteDOMComponent<PopoverProps>('Popover', {
  mapProps: (props) => ({
    role: 'dialog',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: 'absolute',
      backgroundColor: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      padding: '8px',
      display: props.open ? 'block' : 'none',
      zIndex: 1000,
    }),
    'data-open': props.open ? 'true' : 'false',
    'data-anchor': props.anchorEl,
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface TooltipProps extends RemoteDOMComponentProps {
  title?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

export const Tooltip = createRemoteDOMComponent<TooltipProps>('Tooltip', {
  mapProps: (props) => ({
    role: 'tooltip',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: 'absolute',
      backgroundColor: '#333',
      color: 'white',
      padding: '6px 8px',
      borderRadius: '4px',
      fontSize: '0.875rem',
      whiteSpace: 'nowrap',
      zIndex: 1500,
    }),
    'data-placement': props.placement || 'top',
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface ProgressBarProps extends RemoteDOMComponentProps {
  value?: number;
  max?: number;
  variant?: 'determinate' | 'indeterminate';
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const ProgressBar = createRemoteDOMComponent<ProgressBarProps>('ProgressBar', {
  mapProps: (props) => ({
    role: 'progressbar',
    'aria-valuenow': props.value,
    'aria-valuemin': 0,
    'aria-valuemax': props.max || 100,
    class: props.className,
    style: serializeStyle({
      ...props.style,
      width: '100%',
      height: props.size === 'small' ? '4px' : props.size === 'large' ? '12px' : '8px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden',
    }),
    'data-variant': props.variant || 'determinate',
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface SpinnerProps extends RemoteDOMComponentProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const Spinner = createRemoteDOMComponent<SpinnerProps>('Spinner', {
  mapProps: (props) => ({
    role: 'status',
    'aria-label': 'Loading',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      width: props.size === 'small' ? '16px' : props.size === 'large' ? '48px' : '32px',
      height: props.size === 'small' ? '16px' : props.size === 'large' ? '48px' : '32px',
      border: '2px solid #e0e0e0',
      borderTopColor: props.color || '#1976d2',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }),
    'data-size': props.size || 'medium',
  }),
  tagName: 'div',
  renderChildren: false,
});

export interface SkeletonProps extends RemoteDOMComponentProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = createRemoteDOMComponent<SkeletonProps>('Skeleton', {
  mapProps: (props) => ({
    'aria-busy': 'true',
    'aria-label': 'Loading',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      backgroundColor: '#e0e0e0',
      width: props.width,
      height: props.height || (props.variant === 'text' ? '1em' : '128px'),
      borderRadius:
        props.variant === 'circular' ? '50%' :
        props.variant === 'text' ? '4px' :
        '8px',
    }),
    'data-variant': props.variant || 'rectangular',
    'data-animation': props.animation || 'pulse',
  }),
  tagName: 'div',
  renderChildren: false,
});

// =============================================================================
// NAVIGATION COMPONENTS (5)
// =============================================================================

export interface TabsProps extends RemoteDOMComponentProps {
  value?: string | number;
  onChange?: (value: string | number) => void;
  orientation?: 'horizontal' | 'vertical';
}

export const Tabs = createRemoteDOMComponent<TabsProps>('Tabs', {
  mapProps: (props) => ({
    role: 'tablist',
    'aria-orientation': props.orientation || 'horizontal',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'flex',
      flexDirection: props.orientation === 'vertical' ? 'column' : 'row',
      borderBottom: props.orientation === 'vertical' ? 'none' : '1px solid #e0e0e0',
      borderRight: props.orientation === 'vertical' ? '1px solid #e0e0e0' : 'none',
    }),
    'data-value': props.value,
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface BreadcrumbsProps extends RemoteDOMComponentProps {
  separator?: string;
}

export const Breadcrumbs = createRemoteDOMComponent<BreadcrumbsProps>('Breadcrumbs', {
  mapProps: (props) => ({
    'aria-label': 'Breadcrumb',
    role: 'navigation',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }),
    'data-separator': props.separator || '/',
  }),
  tagName: 'nav',
  renderChildren: true,
});

export interface PaginationProps extends RemoteDOMComponentProps {
  count?: number;
  page?: number;
  onChange?: (page: number) => void;
  size?: 'small' | 'medium' | 'large';
  showFirstLast?: boolean;
}

export const Pagination = createRemoteDOMComponent<PaginationProps>('Pagination', {
  mapProps: (props) => ({
    role: 'navigation',
    'aria-label': 'Pagination',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }),
    'data-count': props.count,
    'data-page': props.page,
    'data-size': props.size || 'medium',
  }),
  tagName: 'nav',
  renderChildren: true,
});

export interface MenuProps extends RemoteDOMComponentProps {
  open?: boolean;
  anchorEl?: string;
  onClose?: () => void;
}

export const Menu = createRemoteDOMComponent<MenuProps>('Menu', {
  mapProps: (props) => ({
    role: 'menu',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: 'absolute',
      backgroundColor: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      minWidth: '160px',
      padding: '4px 0',
      display: props.open ? 'block' : 'none',
      zIndex: 1300,
    }),
    'data-open': props.open ? 'true' : 'false',
    'data-anchor': props.anchorEl,
  }),
  tagName: 'div',
  renderChildren: true,
});

export interface DrawerProps extends RemoteDOMComponentProps {
  open?: boolean;
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  variant?: 'permanent' | 'persistent' | 'temporary';
  onClose?: () => void;
}

export const Drawer = createRemoteDOMComponent<DrawerProps>('Drawer', {
  mapProps: (props) => ({
    role: 'dialog',
    class: props.className,
    style: serializeStyle({
      ...props.style,
      position: 'fixed',
      backgroundColor: 'white',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
      zIndex: 1200,
      transition: 'transform 0.3s',
      ...(props.anchor === 'left' && { left: 0, top: 0, bottom: 0, width: '280px' }),
      ...(props.anchor === 'right' && { right: 0, top: 0, bottom: 0, width: '280px' }),
      ...(props.anchor === 'top' && { top: 0, left: 0, right: 0, height: '280px' }),
      ...(props.anchor === 'bottom' && { bottom: 0, left: 0, right: 0, height: '280px' }),
      transform: props.open ? 'none' :
        (props.anchor === 'left' ? 'translateX(-100%)' :
         props.anchor === 'right' ? 'translateX(100%)' :
         props.anchor === 'top' ? 'translateY(-100%)' :
         'translateY(100%)'),
    }),
    'data-open': props.open ? 'true' : 'false',
    'data-anchor': props.anchor || 'left',
    'data-variant': props.variant || 'temporary',
  }),
  tagName: 'aside',
  renderChildren: true,
});

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

/**
 * All Components
 *
 * Registry of all available Remote DOM components.
 * Useful for introspection and dynamic component creation.
 */
export const ALL_COMPONENTS = {
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
  Drawer,
} as const;

/**
 * Component Count by Category
 */
export const COMPONENT_COUNTS = {
  Layout: 10,
  Form: 15,
  Action: 8,
  Display: 10,
  Feedback: 8,
  Navigation: 5,
  Total: 56,
} as const;
