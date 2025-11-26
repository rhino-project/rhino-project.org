---
title: "Rhino UI Overrides: Part 3 - Complete Walkthrough"
description: In this final part of our UI Overrides series, we'll build a complete custom application shell and transform the default table view into a beautiful card-based grid. This walkthrough demonstrates the copy-adapt-wire workflow in practice with real, production-ready code.
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
        walkthrough,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

In [Part 1](/blog/2025/11/04/rhino-ui-overrides-part-1-foundations) and [Part 2](/blog/2025/11/04/rhino-ui-overrides-part-2-advanced-patterns), we covered the foundations and advanced patterns of Rhino's override system. Now let's put it all together with a complete walkthrough: we'll override the application shell and replace the default table view with a beautiful card-based grid.

This walkthrough demonstrates the **copy-adapt-wire** workflow in practice with real, production-ready code you can use in your own projects.

<!-- truncate -->

## Part 1: Override the Application Shell

`ApplicationShell` is Rhino's top-level wrapper around your app (layout, chrome). Swapping it lets you provide your own sidebar, header, containers, etc. Wire it globally in `src/rhino.config.js`:

```javascript
// src/rhino.config.js
import { MyCustomShell } from "./app/frontend/rhino-overrides/shells/MyCustomShell";

const rhinoConfig = {
	version: 1,
	components: {
		ApplicationShell: MyCustomShell,
	},
};

export default rhinoConfig;
```

Your shell must render `children`:

```javascript
// app/frontend/rhino-overrides/shells/MyCustomShell.jsx
export const MyCustomShell = ({ children }) => {
	return (
		<div className="app-shell">
			<aside className="my-sidebar">{/* Your navigation */}</aside>
			<main className="my-container">{children}</main>
		</div>
	);
};
```

Rhino's Shell guide shows the exact override key and the required `children` contract, so this is a safe global swap.

If you want to study the upstream composition (naming, layout points), inspect the source for `ApplicationShell.js` before customizing.

## Part 2: Replace the Index Table with Cards

Rhino's default Index surface uses a table (`ModelIndexTable`). You can globally replace that with any React component that understands the same context (model, results, paths). The fastest route is:

1.  **Copy** the upstream `ModelIndexTable.js` into your project
2.  **Adapt** it to render a **card grid** instead of a table
3.  **Wire** it globally so all models use your version

### Step A: Copy the Baseline Implementation

Grab the current `ModelIndexTable.js` source and paste it into (for example):

```
app/frontend/rhino-overrides/models/CustomerModelIndexTable.jsx
```

This ensures you preserve the expected props/contexts (sorting, paths, row data), then change only the rendering.

### Step B: Implement Your Card UI

Here's a complete implementation that transforms the table into a card grid:

```javascript
// app/frontend/rhino-overrides/models/CustomerModelIndexTable.jsx
import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { get as getPathValue, filter } from "lodash-es";
import {
	useGlobalComponentForModel,
	useModelIndexContext,
	useBaseOwnerNavigation,
	usePaths,
} from "@rhino-project/core/hooks";
import { getModelShowPath } from "@rhino-project/core/utils";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ModelPager } from "@/components/rhino/models/ModelPager";

const getViewablePaths = (model) =>
	filter(model.properties, (a) => {
		return (
			a.type !== "identifier" &&
			a.name !== model.ownedBy &&
			a.type !== "array" &&
			a.type !== "jsonb" &&
			a.type !== "text" &&
			!a.name.endsWith("_attachment")
		);
	}).map((a) => a.name);

const isDesc = (order) => order?.charAt(0) === "-";

const getLabelForPath = (model, path) => {
	const meta = model?.properties?.find?.((p) => p.name === path);
	return meta?.readableName || meta?.name || path;
};

const formatValue = (value) => {
	if (value === null || value === undefined) return "—";
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	if (value instanceof Date) return value.toLocaleString();
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
};

export default function CustomModelIndexTable({ ...props }) {
	const {
		isInitialLoading,
		limit,
		model,
		order,
		resources,
		results,
		setOrder,
	} = useModelIndexContext();

	const { baseRoute, paths } = props;
	const baseOwnerNavigation = useBaseOwnerNavigation();
	const [sorting, setSorting] = useState([]);

	const pathsOrDefault = useMemo(() => {
		if (props.overrides?.ModelTable?.props?.paths)
			console.warn("ModelTable pass legacy paths prop");
		return (
			paths ||
			props.overrides?.ModelTable?.props?.paths ||
			getViewablePaths(model)
		);
	}, [paths, props.overrides?.ModelTable?.props?.paths, model]);

	const computedPaths = usePaths(pathsOrDefault, resources);
	const stringPaths = useMemo(
		() => computedPaths.filter((p) => typeof p === "string"),
		[computedPaths]
	);

	const handleCardClick = useCallback(
		(resourceId) =>
			baseOwnerNavigation.push(
				`${baseRoute}${getModelShowPath(model, resourceId)}`
			),
		[baseRoute, baseOwnerNavigation, model]
	);

	useEffect(() => {
		if (sorting.length === 0 && order) {
			setSorting(
				order.split(",").map((o) => {
					const id = o.replace("-", "");
					return { id, desc: isDesc(o) };
				})
			);
			return;
		}
		if (sorting.length > 0) {
			setOrder(
				sorting.map((o) => (o.desc ? "-" + o.id : o.id)).join(",")
			);
		}
	}, [order, setOrder, sorting]);

	const data = useMemo(() => {
		return results || Array(limit).fill({});
	}, [limit, results]);

	const titlePath = stringPaths[0];

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{data.map((row, idx) => {
					const isPlaceholder = isInitialLoading || !row?.id;
					const resourceId = row?.id ?? idx;

					return (
						<Card
							key={resourceId}
							className="overflow-hidden hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 cursor-pointer"
							onClick={() =>
								!isPlaceholder && handleCardClick(row.id)
							}
						>
							<CardHeader>
								<CardTitle>
									{isPlaceholder ? (
										<div className="h-5 w-2/3 bg-muted animate-pulse rounded" />
									) : (
										formatValue(
											titlePath
												? getPathValue(row, titlePath)
												: row.id
										)
									)}
								</CardTitle>
							</CardHeader>
							<CardDescription className="p-4 pt-0">
								{stringPaths.slice(1, 6).map((path) => (
									<div
										key={path}
										className="flex justify-between gap-4 py-1"
									>
										<div className="text-sm text-muted-foreground">
											{getLabelForPath(model, path)}
										</div>
										<div className="text-sm font-medium truncate max-w-[60%]">
											{isPlaceholder ? (
												<div className="h-4 w-24 bg-muted animate-pulse rounded" />
											) : (
												formatValue(
													getPathValue(row, path)
												)
											)}
										</div>
									</div>
								))}
							</CardDescription>
						</Card>
					);
				})}
			</div>
			<div className="flex justify-end mt-2">
				<ModelPager />
			</div>
		</div>
	);
}
```

### Key Features of This Implementation

1.  **Preserves Rhino's Context**: Uses `useModelIndexContext()` to access model, results, sorting, etc.
2.  **Maintains Sorting**: Syncs with Rhino's server-side sorting via `order` and `setOrder`
3.  **Handles Paths**: Supports both default paths and custom paths from props
4.  **Loading States**: Shows skeleton loaders while data is fetching
5.  **Navigation**: Clicking a card navigates to the show page using Rhino's navigation helpers
6.  **Responsive Grid**: Uses CSS Grid with responsive breakpoints
7.  **Pagination**: Includes Rhino's `ModelPager` component

### Step C: Wire It Globally

```javascript
// src/rhino.config.js
import { CustomerModelIndexTable } from "./app/frontend/rhino-overrides/models/CustomerModelIndexTable";

const rhinoConfig = {
	version: 1,
	components: {
		// Apply to every model's index
		ModelIndexTable: CustomerModelIndexTable,
	},
};

export default rhinoConfig;
```

That's it—every model's Index will now render your card grid. Rhino's UI concepts explicitly support replacing global components (like `ModelIndexTable`) via overrides (globally, per-model, or per-attribute).

**Tip**: Rhino already documents a card view (`ModelIndexCardGrid`) you can drop in with a single override if you don't need a bespoke implementation. You can also control which attributes render on the cards by passing `paths`.

## Notes and Gotchas (Specific to This Example)

### Keep the Contract

When you copy `ModelIndexTable`, maintain the same props (e.g., `paths`, sorting hooks) so pagination/sorting continue to work. Rhino's Index Page guide shows how `paths`/cells are expected to behave.

The card implementation above maintains:

-   The same props interface
-   Integration with Rhino's sorting system
-   Compatibility with paths configuration
-   Proper loading state handling

### Scope If Needed

If you only want cards for some models, move the override under a model key:

```javascript
// src/rhino.config.js
const rhinoConfig = {
	version: 1,
	components: {
		blog: {
			ModelIndexTable: CustomerModelIndexTable, // Only for blogs
		},
		article: {
			ModelIndexTable: CustomerModelIndexTable, // Also for articles
		},
		// Other models still use default table
	},
};
```

### Prefer Base When Wrapping

If you decide to _wrap_ instead of _replace_, wrap the **Base** variant (e.g., `ModelIndexBase`) to avoid infinite loops—a rule Rhino calls out in the overrides docs.

```javascript
// ✅ CORRECT - wrapping with Base
import { ModelIndexTableBase } from "@rhino-project/core/components";

export const MyWrappedTable = (props) => {
	return (
		<div className="my-wrapper">
			<ModelIndexTableBase {...props} />
		</div>
	);
};
```

## Complete Configuration Example

Here's a complete `rhino.config.js` that combines both overrides:

```javascript
// src/rhino.config.js
import { MyCustomShell } from "./app/frontend/rhino-overrides/shells/MyCustomShell";
import { CustomerModelIndexTable } from "./app/frontend/rhino-overrides/models/CustomerModelIndexTable";

const rhinoConfig = {
	version: 1,
	components: {
		// Global shell override
		ApplicationShell: MyCustomShell,

		// Global table-to-card override
		ModelIndexTable: CustomerModelIndexTable,

		// Optional: model-specific tweaks
		blog: {
			ModelIndexTable: {
				props: {
					// Custom paths for blog cards
					paths: ["title", "published_at", "author"],
				},
			},
		},
	},
};

export default rhinoConfig;
```

## Testing Your Overrides

After implementing overrides, test:

1.  **All Models**: Ensure the card view works across different models
2.  **Sorting**: Verify server-side sorting still works
3.  **Pagination**: Check that pagination controls function correctly
4.  **Navigation**: Confirm clicking cards navigates to the show page
5.  **Loading States**: Verify skeleton loaders appear during data fetching
6.  **Responsive**: Test on different screen sizes

## Troubleshooting

### Cards Not Rendering

-   Check that your component is properly exported
-   Verify the import path in `rhino.config.js`
-   Ensure you're using the correct component name (`ModelIndexTable`)

### Sorting Not Working

-   Make sure you're syncing with `order` and `setOrder` from context
-   Verify the sorting state transformation logic

### Navigation Issues

-   Check that `baseRoute` is passed correctly
-   Verify `getModelShowPath` is generating correct paths
-   Ensure `useBaseOwnerNavigation` is working

## Related Doc Entry Points

-   **UI → Shell** (override `ApplicationShell`)
-   **UI → Index page** (paths, headers/footers, card grid option)
-   **Concepts → User Interface** (component categories, global/local overrides, paths)
-   **Guides → General Configuration** (`rhino.config.js` location & global override map)

## Closing Thoughts

Overriding Rhino's UI is straightforward once you adopt the **copy–adapt–wire** discipline and lean on **paths** for small customizations. Use **Base** components to wrap safely, scope changes thoughtfully, and you'll get the exact behavior you need, without fighting the framework.

The examples in this walkthrough demonstrate production-ready patterns that maintain Rhino's contracts while giving you complete control over the presentation. The official docs back these patterns and spell out the knobs you can turn; keep them close as you iterate.

## Summary: The Complete Override Workflow

1.  **Identify** the component you want to change (use React DevTools)
2.  **Copy** the Base implementation to your project
3.  **Adapt** the rendering/behavior while keeping the props contract
4.  **Wire** it in `rhino.config.js` with appropriate scoping
5.  **Test** across different models and scenarios
6.  **Document** why you made the override for future reference

This workflow, combined with the patterns from Parts 1 and 2, gives you everything you need to customize Rhino's UI to match your exact requirements.

---

_This blog post concludes our three-part series on Rhino UI Overrides. Read [Part 1: Foundations](/blog/2025/11/04/rhino-ui-overrides-part-1-foundations) and [Part 2: Advanced Patterns](/blog/2025/11/04/rhino-ui-overrides-part-2-advanced-patterns) to get the full picture._
