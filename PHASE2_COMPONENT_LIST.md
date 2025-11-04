# Phase 2 Component Library - Complete Component List

## All 56 Components by Category

### Layout Components (10)

| Component | Props | Description |
|-----------|-------|-------------|
| **Container** | `maxWidth`, `padding` | Max-width container with padding control |
| **Row** | `gap`, `align`, `justify` | Horizontal flex layout with alignment |
| **Column** | `gap`, `align` | Vertical flex layout |
| **Grid** | `columns`, `gap`, `rowGap`, `columnGap` | CSS Grid with column configuration |
| **Stack** | `direction`, `gap`, `align` | Directional stack (horizontal/vertical) |
| **Spacer** | `size` | Fixed-size spacing element |
| **Divider** | `orientation`, `thickness`, `color` | Horizontal/vertical divider line |
| **Section** | - | Semantic HTML section element |
| **Panel** | `padding`, `bordered`, `shadow` | Content panel with border/shadow options |
| **Card** | `padding`, `hoverable` | Card component with hover effects |

### Form Components (15)

| Component | Props | Description |
|-----------|-------|-------------|
| **Input** | `type`, `value`, `placeholder`, `disabled`, `required`, `onChange` | Text input (text, email, password, number, tel, url, search) |
| **TextArea** | `value`, `placeholder`, `rows`, `cols`, `maxLength`, `onChange` | Multi-line text input |
| **Select** | `value`, `disabled`, `required`, `multiple`, `onChange` | Dropdown selection |
| **Checkbox** | `checked`, `disabled`, `required`, `value`, `onChange` | Checkbox input |
| **Radio** | `checked`, `disabled`, `name`, `value`, `onChange` | Radio button input |
| **Switch** | `checked`, `disabled`, `onChange` | Toggle switch with switch role |
| **Slider** | `value`, `min`, `max`, `step`, `disabled`, `onChange` | Range slider input |
| **DatePicker** | `value`, `min`, `max`, `disabled`, `onChange` | Date picker input |
| **TimePicker** | `value`, `min`, `max`, `step`, `onChange` | Time picker input |
| **ColorPicker** | `value`, `disabled`, `onChange` | Color selection input |
| **FileUpload** | `accept`, `multiple`, `disabled`, `onChange` | File upload input |
| **FormGroup** | - | Form field container with margin |
| **FormLabel** | `htmlFor`, `required` | Form field label |
| **FormError** | - | Error message display with alert role |
| **FormHelper** | - | Helper text display |

### Action Components (8)

| Component | Props | Description |
|-----------|-------|-------------|
| **Button** | `type`, `disabled`, `variant`, `size`, `onClick` | Standard button (primary, secondary, danger, ghost) |
| **IconButton** | `icon`, `label`, `disabled`, `size`, `onClick` | Circular icon button with aria-label |
| **LinkButton** | `href`, `target`, `rel`, `disabled`, `onClick` | Link-styled button |
| **MenuButton** | `disabled`, `expanded`, `onClick` | Button with dropdown menu (aria-haspopup) |
| **ActionBar** | `justify`, `gap` | Horizontal action button container |
| **ButtonGroup** | `orientation`, `spacing` | Grouped buttons (horizontal/vertical) |
| **DropdownButton** | `disabled`, `expanded`, `onClick` | Dropdown trigger button |
| **SplitButton** | `disabled`, `onPrimaryClick`, `onMenuClick` | Split action button |

### Display Components (10)

| Component | Props | Description |
|-----------|-------|-------------|
| **Text** | `size`, `weight`, `color`, `align` | Styled text span (small, medium, large) |
| **Heading** | `level`, `color`, `align` | Heading element (data-level for h1-h6) |
| **Link** | `href`, `target`, `rel`, `underline`, `onClick` | Anchor link with safe defaults |
| **Badge** | `variant`, `size` | Small status badge (default, primary, success, warning, danger) |
| **Tag** | `closable`, `onClose` | Closable tag with border |
| **Chip** | `variant`, `size`, `deletable`, `onDelete`, `onClick` | Deletable chip (filled, outlined) |
| **Avatar** | `src`, `alt`, `size`, `shape` | User avatar (circle, square) |
| **Icon** | `name`, `size`, `color` | Icon display element |
| **Image** | `src`, `alt`, `width`, `height`, `loading`, `objectFit` | Image with lazy loading |
| **Video** | `src`, `controls`, `autoPlay`, `loop`, `muted`, `poster` | Video player element |

### Feedback Components (8)

| Component | Props | Description |
|-----------|-------|-------------|
| **Alert** | `severity`, `variant`, `closable`, `onClose` | Alert messages (info, success, warning, error) |
| **Toast** | `duration`, `position`, `onClose` | Toast notification (6 positions) |
| **Modal** | `open`, `closeOnBackdrop`, `onClose` | Modal dialog with backdrop |
| **Popover** | `open`, `anchorEl`, `onClose` | Popover overlay anchored to element |
| **Tooltip** | `title`, `placement` | Hover tooltip (top, right, bottom, left) |
| **ProgressBar** | `value`, `max`, `variant`, `size`, `color` | Progress indicator (determinate, indeterminate) |
| **Spinner** | `size`, `color` | Loading spinner with animation |
| **Skeleton** | `variant`, `width`, `height`, `animation` | Content placeholder (text, circular, rectangular) |

### Navigation Components (5)

| Component | Props | Description |
|-----------|-------|-------------|
| **Tabs** | `value`, `orientation`, `onChange` | Tabbed interface (horizontal, vertical) |
| **Breadcrumbs** | `separator` | Breadcrumb navigation with custom separator |
| **Pagination** | `count`, `page`, `size`, `showFirstLast`, `onChange` | Page navigation |
| **Menu** | `open`, `anchorEl`, `onClose` | Dropdown menu anchored to element |
| **Drawer** | `open`, `anchor`, `variant`, `onClose` | Slide-out drawer (left, right, top, bottom) |

## Usage Example

```tsx
import {
  Container,
  Card,
  Heading,
  Stack,
  Input,
  Button,
  Alert
} from './component-library-v2';

function MyForm() {
  return (
    <Container maxWidth="800px">
      <Card padding="24px">
        <Heading level={2}>Contact Form</Heading>
        <Stack direction="vertical" gap="16px">
          <Input
            type="text"
            placeholder="Your name"
            required
          />
          <Input
            type="email"
            placeholder="Your email"
            required
          />
          <Button
            variant="primary"
            onClick={() => console.log('Submit')}
          >
            Submit
          </Button>
        </Stack>
        <Alert severity="info">
          All fields are required
        </Alert>
      </Card>
    </Container>
  );
}
```

## Component Architecture

All components follow the same pattern:

1. **Props Interface:** TypeScript interface extending `RemoteDOMComponentProps`
2. **Factory Creation:** Created via `createRemoteDOMComponent<Props>()`
3. **Prop Mapping:** `mapProps` converts React props to DOM attributes
4. **Event Mapping:** `mapEvents` registers event handlers
5. **Tag Name:** Maps to standard HTML element
6. **Children:** Optionally renders React children

## Type Safety

All components are fully typed with TypeScript:
- Props interfaces for compile-time checking
- Generic factory pattern for type inference
- Strict event handler types
- CSS properties with IntelliSense support

## Export Structure

```typescript
export {
  // Factory
  createRemoteDOMComponent,
  serializeStyle,
  serializeEventListener,
  
  // All components (56 total)
  Container, Row, Column, Grid, Stack, Spacer, Divider, Section, Panel, Card,
  Input, TextArea, Select, Checkbox, Radio, Switch, Slider, DatePicker, TimePicker,
  ColorPicker, FileUpload, FormGroup, FormLabel, FormError, FormHelper,
  Button, IconButton, LinkButton, MenuButton, ActionBar, ButtonGroup,
  DropdownButton, SplitButton,
  Text, Heading, Link, Badge, Tag, Chip, Avatar, Icon, Image, Video,
  Alert, Toast, Modal, Popover, Tooltip, ProgressBar, Spinner, Skeleton,
  Tabs, Breadcrumbs, Pagination, Menu, Drawer,
  
  // Registry
  ALL_COMPONENTS,
  COMPONENT_COUNTS
};
```

---

**Total: 56 components** across 6 categories, fully typed and tested.
