---
title: "Rhino UI Overrides: Part 2 - Advanced Patterns and Pitfalls"
description: Once you understand the basics of Rhino's override system, you can tackle more complex scenarios. This second part covers overriding behavior (not just markup), working with paths, real-world examples, and the common pitfalls to avoid.
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
        patterns,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

In [Part 1](/blog/2025/11/04/rhino-ui-overrides-part-1-foundations), we covered the foundations of Rhino's override system—what overrides are, when to use them, and the basic workflow. Now we'll dive into the tricky parts: overriding behavior (not just markup), leveraging paths for fine-grained control, and real-world patterns that work in production.

<!-- truncate -->

## The "Tricky" Part: Overriding Behavior, Not Just Markup

Many teams start by styling and quickly realize they need to change behavior—e.g., how a field serializes to the API, how a table sorts/paginates, or how form groups validate and show feedback. Rhino's **paths** and **component categories** are central here.

### Understanding Paths

**Paths** choose which attributes (and in what order) render in forms/tables. They can be:

-   **Strings** - Simple attribute names (e.g., `"title"`, `"published_at"`)
-   **React elements** - Custom cell/field components
-   **Functions** - Dynamic paths that return arrays based on context
-   **Role-aware structures** - Paths that vary based on user roles

This lets you wire custom cells/fields inline without a full global override.

### Component Categories for Behavior Overrides

**Component categories** (Global/Base/Simple/Abstract/Composite/Convenience) tell you where to hook in. For example, **Convenience** components expose a merged-overrides pattern via `useMergedOverrides`, making it easy to layer custom behavior.

## Practical Patterns

### Pattern 1: Forms - Changing How Inputs Talk to the API

If you need to change how an input talks to the API, override the **Field Group** (e.g., `FieldGroupString`) or the **Layout** (e.g., `FieldLayoutVertical`) to inject custom label/feedback handling globally—then scope per model where necessary.

```javascript
// src/rhino.config.js
import { MyStringInput } from "./app/frontend/rhino-overrides/fields/MyStringInput";
import { MyFieldLabel } from "./app/frontend/rhino-overrides/fields/MyFieldLabel";
import { MyFieldFeedback } from "./app/frontend/rhino-overrides/fields/MyFieldFeedback";

const rhinoConfig = {
	version: 1,
	components: {
		// Global field group override
		FieldGroupString: { Field: MyStringInput },

		// Global layout overrides
		FieldLayoutVertical: {
			FieldLabel: MyFieldLabel,
			FieldFeedback: MyFieldFeedback,
		},
	},
};

export default rhinoConfig;
```

This approach keeps the **Rhino field group contract** (value, onChange, errors), while letting you change masking, normalization, or async validation—without rewriting your entire form surface.

### Pattern 2: Tables - Custom Sorting and Link Behavior

If you need custom sorting or link behavior, start with `ModelIndexTable` (or even just cells via `paths` with `ModelCell` or a custom cell). Use TanStack Table primitives exposed by the Base implementation to keep server-side sorting/paging in sync.

```javascript
// app/frontend/rhino-overrides/ModelIndexTable.jsx
import { useModelIndexContext } from '@rhino-project/core/hooks';
import { useReactTable, getCoreRowModel } from '@tanstack/react-table';

export const CustomModelIndexTable = (props) => {
  const { model, results, order, setOrder } = useModelIndexContext();

  // Use TanStack Table to maintain server-side sorting
  const table = useReactTable({
    data: results || [],
    columns: /* your column definitions */,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Important: server-side sorting
    state: {
      sorting: /* map from order prop */
    },
    onSortingChange: (updater) => {
      // Sync back to Rhino's setOrder
      setOrder(/* transformed sorting state */);
    }
  });

  // Your custom rendering logic
  return (
    <div className="my-index-table">
      {/* Custom table markup */}
    </div>
  );
};
```

Rhino uses TanStack Table under the hood, so you can leverage its full API while maintaining compatibility with Rhino's server-side operations.

## Real-World Examples

### Example A: Change Index Table Behavior—But Safely

Suppose you want custom column headers and row navigation. Copy the base table locally (e.g., `ModelIndexTable.jsx`), keep the expected props, and then wire it:

```javascript
// app/frontend/rhino-overrides/ModelIndexTable.jsx
import {
	// use Rhino's hooks and model context
	useModelIndexContext,
	useBaseOwnerNavigation,
	usePaths,
} from "@rhino-project/core/hooks";
import {
	// tanstack table bits, same as base impl
	useReactTable,
	getCoreRowModel,
} from "@tanstack/react-table";

export const ModelIndexTable = (props) => {
	// Keep the same signature/shape as the base impl
	const { model, results, order, setOrder } = useModelIndexContext();
	const { baseRoute } = props;
	const baseOwnerNavigation = useBaseOwnerNavigation();

	// Add your column helpers, sorting mapping, row click, skeletons, etc.
	const handleRowClick = (resourceId) => {
		baseOwnerNavigation.push(`${baseRoute}/${resourceId}`);
	};

	return (
		<div className="my-index-table">
			{/* Render a Table component or your own markup */}
			<table>{/* Custom table implementation */}</table>
		</div>
	);
};
```

Then wire it globally:

```javascript
// src/rhino.config.js (global)
import { ModelIndexTable } from "./app/frontend/rhino-overrides/ModelIndexTable";

const rhinoConfig = {
	version: 1,
	components: {
		ModelIndexTable, // replaces globally
	},
};

export default rhinoConfig;
```

### Example B: Override Field Groups So Forms Talk to the API the Way You Want

```javascript
// src/rhino.config.js
import { MyStringInput } from "./app/frontend/rhino-overrides/fields/MyStringInput";

const rhinoConfig = {
	version: 1,
	components: {
		FieldGroupString: { Field: MyStringInput }, // global
		FieldLayoutVertical: {
			FieldLabel: MyFieldLabel,
			FieldFeedback: MyFieldFeedback,
		},
	},
};

export default rhinoConfig;
```

Your custom input component maintains the same interface:

```javascript
// app/frontend/rhino-overrides/fields/MyStringInput.jsx
export const MyStringInput = ({ value, onChange, errors, ...props }) => {
	// Custom masking, normalization, or async validation
	const handleChange = (e) => {
		const normalized = normalizeValue(e.target.value);
		onChange(normalized);
	};

	return (
		<input
			value={value}
			onChange={handleChange}
			className={errors ? "error" : ""}
			{...props}
		/>
	);
};
```

### Example C: Per-Model Path Control (Fine-Grained, Zero Copy)

Paths are extremely powerful—use them first whenever a small tweak will do:

```javascript
// src/rhino.config.js
import { MyCustomCell } from "./app/frontend/components/MyCustomCell";

const rhinoConfig = {
	version: 1,
	components: {
		blog_post: {
			ModelIndexTable: {
				props: {
					// Strings + custom elements + role-aware functions are all supported
					paths: [
						"title",
						<MyCustomCell key="status" />,
						(roles, resources) => {
							// Role-based paths
							if (roles.includes("admin")) {
								return [
									"title",
									"status",
									"published_at",
									"analytics",
								];
							}
							return ["title", "status"];
						},
					],
				},
			},
		},
	},
};

export default rhinoConfig;
```

This approach requires no component copying—you're just configuring what renders and in what order.

## Common Pitfalls to Avoid

### 1. Infinite Loops

**Problem**: If you _wrap_ a component globally, **never** wrap the global component in itself.

**Solution**: Always wrap the **Base** variant (e.g., `ModelEditBase`) to avoid recursion.

```javascript
// ❌ WRONG - will cause infinite recursion
const rhinoConfig = {
	components: {
		ModelEdit: (props) => <ModelEdit {...props} />, // Calls itself!
	},
};

// ✅ CORRECT - wrap the Base component
const rhinoConfig = {
	components: {
		ModelEdit: (props) => <ModelEditBase {...props} />,
	},
};
```

### 2. Forgetting Scopes

**Problem**: If you override globally and only needed it on one model/attribute, you'll surprise other screens.

**Solution**: Prefer scoping under a model key (and even attribute key) in `rhino.config.js`.

```javascript
// ❌ WRONG - affects all models
const rhinoConfig = {
	components: {
		ModelIndexTable: MyCustomTable, // Applies everywhere!
	},
};

// ✅ CORRECT - scoped to specific model
const rhinoConfig = {
	components: {
		blog: {
			ModelIndexTable: MyCustomTable, // Only for blogs
		},
	},
};
```

### 3. Breaking Contracts

**Problem**: Changing props that Rhino expects can break upstream hooks and controllers.

**Solution**: Keep the component's props contract intact. When copying a base file, change as little as possible and keep the same external interface.

```javascript
// ✅ GOOD - maintains contract
export const CustomFieldGroup = ({ value, onChange, errors, ...props }) => {
	// Custom logic but same interface
	return <input value={value} onChange={onChange} />;
};

// ❌ BAD - breaks contract
export const CustomFieldGroup = ({ myValue, myOnChange }) => {
	// Missing expected props!
};
```

### 4. Re-inventing Paths

**Problem**: Creating a full override when a simple path change would suffice.

**Solution**: Use **paths** to include custom cells/fields inline or to vary by role/state.

```javascript
// ❌ OVERKILL - full component override
// When you just need to change which fields show

// ✅ BETTER - use paths
const rhinoConfig = {
	components: {
		blog: {
			ModelIndexTable: {
				props: {
					paths: ["title", "published_at", <CustomStatusCell />],
				},
			},
		},
	},
};
```

### 5. Forgetting Global Config Location

**Problem**: Overrides not working because they're in the wrong file.

**Solution**: Global overrides belong in `src/rhino.config.js` (the docs also call this out under UI _General Configuration_).

## Beyond UI: Ruby "Overrides" vs. UI Overrides

Rhino also discusses **Ruby-side overrides** (e.g., `class_eval` or module prepending for controllers). That's for server behavior—**not** the React UI. Keep the two ideas separate: this post focuses on _UI overrides_, but it's good to know where the term appears elsewhere in the docs.

## A Quick Checklist Before You Ship

Before implementing an override, ask yourself:

-   ✅ Did you copy the **Base** component (when wrapping) to avoid recursion?
-   ✅ Are imports updated to your app's structure?
-   ✅ Does the override keep the same props contract?
-   ✅ Can this be solved with **paths** or a **local** override instead of global?
-   ✅ Is the override scoped (model/attribute) to minimize blast radius?

## Useful Doc Entry Points

-   **User Interface (concepts)**: models/attributes, paths, component categories, and the overrides API (global/local; alter props / wrap / replace / remove).
-   **General UI configuration**: where `rhino.config.js` lives and high-level knobs (theming, logos, routes).
-   **Tech stack**: React + Reactstrap/Bootstrap + TanStack Table/Query, React Hook Form/Yup, etc., helps you reason about the base implementations you copy.

## Opinionated Guidance (What Works Well on Real Teams)

-   **Start narrow** (per-model override or paths) and **promote** to global only after repeated reuse.
-   **Keep each override small**; create shared building blocks and compose them.
-   **Document why** you overrode a component (commit message or an ADR), including the upstream version/date—future you will thank you during upgrades.
-   **Treat copied Base files as mirrors**: re-check upstream when you bump Rhino, and reconcile diffs deliberately.

## Next Steps

Now that you understand advanced patterns and pitfalls, you're ready for a complete walkthrough. In [Part 3](/blog/2025/11/04/rhino-ui-overrides-part-3-complete-walkthrough), we'll build a custom application shell and a card-based index view from start to finish.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities. Read [Part 1: Foundations](/blog/2025/11/04/rhino-ui-overrides-part-1-foundations) or continue with [Part 3: Complete Walkthrough](/blog/2025/11/04/rhino-ui-overrides-part-3-complete-walkthrough)._
