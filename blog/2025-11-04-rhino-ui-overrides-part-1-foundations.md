---
title: "Rhino UI Overrides: Part 1 - Foundations"
description: Rhino's UI is intentionally "open"—you can keep the defaults or surgically replace any piece of the interface through overrides. This first part of our series explores what overrides are, when to use them, and the safe workflow for implementing custom components.
authors: Ehsan
tags:
    [
        rhino-project,
        webdev,
        ruby,
        rails,
        opensource,
        react,
        ui,
        overrides,
        customization,
        frontend,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

Rhino's UI is intentionally "open"—you can keep the defaults, or you can surgically replace any piece of the interface. The mechanism that makes this possible is **overrides**. In this three-part series, we'll walk through _why_ and _how_ to override, what you can (and can't) swap, the safest workflow for copying base components, and the sharp edges to avoid.

This first part covers the foundations: understanding what overrides are, when to use them versus composing with existing components, and establishing a safe, repeatable workflow.

<!-- truncate -->

## What "Overrides" Actually Are in Rhino

Rhino exposes a **global + local overrides system** that lets you:

-   **Alter** a component's **props**
-   **Wrap** an existing component (with the **Base** component)
-   **Replace** a component entirely
-   **Remove** a component from the UI

Global overrides live in `src/rhino.config.js` and can be scoped to _all models_, a _single model_, or even a _single attribute_. The same API can also be passed _locally_ as a prop to a page/component.

Rhino's UI layer is built with React (Vite/Ruby Vite), Reactstrap/Bootstrap, and TanStack Table/Query—so you're overriding real React components with predictable props and composition rules.

### The Override Scope Hierarchy

Rhino's override system follows a clear hierarchy:

1.  **Global** - Applies to all models and attributes
2.  **Model-specific** - Override for a single model (e.g., `blog`)
3.  **Attribute-specific** - Override for a single attribute within a model (e.g., `blog.title`)

Local overrides passed as props take precedence over global configuration, allowing you to customize on a per-component basis.

## When to Override vs. Compose

Understanding when to override versus when to compose is crucial for making the right architectural decisions:

### Override When:

-   You need to change how Rhino's view controllers talk to the API
-   You want to modify how a core UI surface behaves (forms, tables, filters)
-   You're using the same data/contexts Rhino already provides but need different presentation
-   You need to remove or fundamentally change a component's behavior

### Compose When:

-   You're building a custom screen around Rhino's hooks
-   You want to use "Simple" components (e.g., `ModelIndexSimple`) that provide context without default UI
-   You're creating a completely bespoke layout that doesn't fit Rhino's default patterns
-   You need fine-grained control over the rendering without touching core components

### Component Categories

A useful mental model from the Rhino docs:

-   **Global components** are the ones you override (e.g., `ModelIndexTable`, `ModelEditForm`)
-   **Base components** are the underlying implementations you use for wrapping to avoid recursion (e.g., `ModelIndexTableBase`, `ModelEditBase`)
-   **Simple components** provide context, no UI (great for bespoke layouts)
-   **Abstract/Composite/Convenience** components layer behavior and common override patterns

## The Safe, Repeatable Workflow: Copy–Adapt–Wire

Rhino's docs demonstrate the override API clearly, but in practice most teams follow a **copy–adapt–wire** loop:

### Step 1: Identify the Exact Component

Use React DevTools to inspect the rendered tree and find component names like:

-   `ModelEditForm`
-   `ModelIndexHeader`
-   `FieldGroupString`
-   `DisplayGroupDate`
-   `ModelIndexTable`

The concepts page shows how models/attributes map into these surfaces and how they're referenced via **paths**. Understanding the component hierarchy is essential before making changes.

### Step 2: Fetch the Base Implementation

**Critical rule**: In Rhino terms, don't wrap the **global** component—**use the Base variant for wrappers** to avoid infinite loops (e.g., use `ModelEditBase`, not `ModelEdit`).

Copy the base component's code into your app (e.g., `app/frontend/components/rhino-overrides/ModelEditForm.jsx`). Update imports from Rhino packages to your local paths where needed.

### Step 3: Adapt Behavior (Minimal Diff)

Keep the interface (props) intact so it drops into Rhino's composition points. Make your changes: data shape, layout, actions, validation, cell renderers, etc.

The key is to maintain the same contract that Rhino expects while changing only what's necessary.

### Step 4: Wire the Override

**Globally:** set the override in `src/rhino.config.js` under `components`.

**Per-model or per-attribute:** nest under the model key or attribute key.

## Basic Examples

### Example 1: Remove a Component Everywhere

```javascript
// src/rhino.config.js
const rhinoConfig = {
	version: 1,
	components: {
		ModelFooter: null,
	},
};

export default rhinoConfig;
```

Setting a component to `null` removes it from the UI entirely. This is useful when you want to replace Rhino's default footer with your own implementation or remove it completely.

### Example 2: Remove Per-Model

You can scope the same removal to a specific model or attribute by nesting:

```javascript
// src/rhino.config.js
const rhinoConfig = {
	version: 1,
	components: {
		blog: {
			title: {
				ModelFooter: null, // Remove footer only for blog.title
			},
		},
	},
};
```

### Example 3: Replace with Your Own Component

```javascript
// src/rhino.config.js
import { MyCustomSort } from "./app/frontend/rhino-overrides/MyCustomSort";
import { MyCustomPager } from "./app/frontend/rhino-overrides/MyCustomPager";

const rhinoConfig = {
	version: 1,
	components: {
		blog: {
			ModelSort: MyCustomSort, // shorthand
			ModelPager: { component: MyCustomPager }, // explicit
		},
	},
};

export default rhinoConfig;
```

Both syntaxes work—you can use the component directly or wrap it in an object with a `component` property.

### Example 4: Local Overrides

You can also pass overrides **locally** to specific components:

```javascript
const overrides = {
	ModelIndexHeader: { ModelSort: MyCustomSort },
};

export const Posts = () => <ModelIndex overrides={overrides} />;
```

This is useful when you need a one-off customization that doesn't warrant a global change.

## Understanding Component Contracts

When overriding components, it's crucial to understand and maintain the component contracts:

-   **Props**: What props does Rhino pass to your component?
-   **Context**: What hooks and contexts are available?
-   **Behavior**: What side effects and lifecycle methods are expected?

Breaking these contracts can cause unexpected behavior or errors. Always refer to the source implementation or Rhino's documentation when creating overrides.

## Common Override Targets

Here are some of the most commonly overridden components:

### Form Components

-   `ModelEditForm` - The entire edit form
-   `FieldGroupString` - String input fields
-   `FieldGroupNumber` - Number input fields
-   `FieldLayoutVertical` - Form field layout
-   `FieldLabel` - Field labels
-   `FieldFeedback` - Error messages and validation feedback

### Index/List Components

-   `ModelIndexTable` - The main table view
-   `ModelIndexHeader` - Table header with sorting/filtering
-   `ModelIndexFooter` - Table footer with pagination
-   `ModelSort` - Sorting controls
-   `ModelPager` - Pagination controls

### Display Components

-   `ModelShow` - The show/detail view
-   `DisplayGroupString` - String display
-   `DisplayGroupDate` - Date display
-   `DisplayGroupBoolean` - Boolean display

## Next Steps

Now that you understand the foundations of Rhino's override system, you're ready to dive deeper. In [Part 2](/blog/2025/11/04/rhino-ui-overrides-part-2-advanced-patterns), we'll explore advanced patterns, including overriding behavior (not just markup), working with paths, and avoiding common pitfalls.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities. Continue reading with [Part 2: Advanced Patterns and Pitfalls](/blog/2025/11/04/rhino-ui-overrides-part-2-advanced-patterns)._
