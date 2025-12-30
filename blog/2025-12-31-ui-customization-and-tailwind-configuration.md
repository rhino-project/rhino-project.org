---
title: "UI Customization and Tailwind Configuration in Rhino"
description: Learn how to customize Rhino's UI by overriding the application shell, composing components, and using React hooks. This guide also covers common Tailwind CSS v4 configuration issues and how to fix them.
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
        tailwind,
        customization,
        frontend,
        configuration,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

Rhino provides a flexible UI system that allows you to customize the application shell, compose components, and integrate with modern CSS frameworks like Tailwind CSS. This guide covers best practices for UI customization and common configuration issues you might encounter.

<!-- truncate -->

## UI Overriding Instructions

### 1. Application Shell Override

You can perform a complete override of the application shell. When designing your custom shell, it's important to maintain essential application functionality while customizing the layout and styling. Consider the following best practices:

-   Applications should include a navigation bar for primary navigation
-   Users should have access to authentication controls, such as a logout button
-   Users should have access to account management, such as a settings button
-   The application shell's style should match your UI design and configured Tailwind setup
-   **Keep the application shell focused on layout and navigation** - page content should be rendered through the shell's children prop, not embedded directly in the shell component

The application shell is the top-level wrapper around your app. When overriding it, ensure you maintain essential navigation and user controls while customizing the layout and styling to match your design system. The shell should render page content via the `children` prop, maintaining a clear separation between layout and content.

### 2. Component Composition

Rhino provides a comprehensive set of pre-built components that are production-ready and well-tested. Rather than completely overriding these components, prefer composition to extend functionality. This approach reduces the risk of introducing errors and maintains compatibility with Rhino's internal systems. Detailed instructions for component composition can be found in the [UI Overrides documentation](/blog/2025/11/04/rhino-ui-overrides-part-1-foundations).

**Best practices for component composition:**

-   Prefer wrapping existing components over replacing them entirely
-   Use Base components when wrapping to avoid infinite loops
-   Leverage Rhino's component hierarchy (Global/Base/Simple/Abstract)
-   Compose new functionality using existing Rhino hooks and contexts

### 3. Models and Data Access

Understanding your data model is crucial for building effective UI components. Review your models and their relationships in `/app/models` and `schema.rb` to understand the data structure. These models are automatically exposed via a REST API by Rhino. You don't need to manually fetch data using `fetch` or similar methods - Rhino provides React hooks that handle data fetching, caching, and state management automatically. The following section covers how to use these hooks.

### 4. Adding Pages and Using React Hooks

To add a new page to your Rhino application, register it in `custom.jsx`. Once registered, you can use Rhino's React hooks to fetch data instead of manually using `fetch` or other HTTP libraries. The `useModelIndex` hook, when configured with the `results` key, automatically fetches data for the specified model. Additionally, if the model's `rhino_references` array includes related objects and child table associations, these will be automatically loaded as well, eliminating the need for multiple API calls.

**Available React Hooks for CRUD Operations:**

-   `useModelIndex` - For fetching lists of resources (GET)
-   `useModelCreate` - For creating new resources (POST)
-   `useModelUpdate` - For updating existing resources (PUT/PATCH)
-   `useModelDelete` - For deleting resources (DELETE)

**Example usage:**

```javascript
import { useModelIndex } from "@rhino-project/core/hooks";

function ProductsPage() {
	const { data, isLoading, error } = useModelIndex("product", {
		results: true, // Fetches the data automatically
	});

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {error.message}</div>;

	return (
		<div>
			{data?.results?.map((product) => (
				<ProductCard key={product.id} product={product} />
			))}
		</div>
	);
}
```

These hooks automatically handle:

-   Loading states
-   Error handling
-   Related data fetching (if `rhino_references` is configured)
-   Caching and refetching

### 5. Tailwind Configuration

Proper Tailwind CSS configuration is essential for styling your custom UI components. Refer to the Tailwind configuration documentation to ensure components are properly configured. The following section covers common configuration issues and their solutions.

## Tailwind CSS v4 Configuration Fix

### The Problem

The dashboard layout was not displaying correctly - specifically, the 2-column grid layout wasn't working even though the Tailwind CSS classes (`grid`, `grid-cols-1`, `lg:grid-cols-3`, etc.) were present in the HTML.

### Root Causes

1.  **CSS Import Order**: Tailwind CSS was imported AFTER Bootstrap, causing Bootstrap's CSS to potentially override Tailwind utility classes
2.  **Missing Vite Plugin**: Tailwind CSS v4 requires the `@tailwindcss/vite` plugin for proper processing in Vite-based projects
3.  **Import Location**: Tailwind CSS was imported in `Root.jsx` instead of the main entry point, which could cause timing issues with CSS loading

### The Solution

#### Step 1: Fixed CSS Import Order

**File**: `app/frontend/entrypoints/application.jsx`

Changed the import order so Tailwind CSS loads BEFORE Bootstrap:

```javascript
import "@/styles/dashboard.css"; // Import Tailwind FIRST
import "@/styles/styles.scss"; // Then Bootstrap
```

**Why this matters**: CSS specificity and cascade rules mean that styles loaded later can override earlier ones. By importing Tailwind first, we ensure Tailwind utilities can override Bootstrap if needed, and more importantly, Tailwind utilities aren't being stripped out or ignored.

#### Step 2: Removed Duplicate Import

**File**: `app/frontend/Root.jsx`

Removed the duplicate Tailwind import:

```javascript
// REMOVED: import './styles/dashboard.css';
```

**Why this matters**: Having CSS imports in multiple places can cause:

-   Duplicate CSS in the bundle
-   Unpredictable load order
-   Harder to debug styling issues

#### Step 3: Installed and Configured Tailwind Vite Plugin

**Installation**:

```bash
npm install -D @tailwindcss/vite
```

**File**: `vite.config.ts`

Added the Tailwind CSS Vite plugin:

```typescript
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [
		ViteRails(),
		RhinoProjectVite({ enableJsxInJs: false }),
		tailwindcss(), // Added this
		react(),
		ViteEslint({ eslintOptions: { cache: false } }),
	],
	// ...
});
```

**Why this matters**: Tailwind CSS v4 uses a new architecture that requires the Vite plugin for:

-   Proper CSS processing and tree-shaking
-   Generating utility classes on-demand
-   Better build performance
-   Correct handling of Tailwind directives

## Key Takeaways

### 1. CSS Import Order is Critical

**Always import Tailwind CSS BEFORE other CSS frameworks** (Bootstrap, Material-UI, etc.) to avoid conflicts and ensure Tailwind utilities work correctly.

**Rule of thumb**:

-   Framework CSS (Tailwind) → Base/Global styles → Component libraries → Custom overrides

### 2. Use the Official Vite Plugin for Tailwind v4

Tailwind CSS v4 requires the `@tailwindcss/vite` plugin for Vite projects. Attempting to use Tailwind v4 without this plugin will result in incorrect CSS processing and utility classes not being generated properly.

### 3. Import CSS in Entry Points, Not Components

Import CSS files in your main entry point (`application.jsx` or `main.jsx`), not in individual components. This ensures:

-   Predictable load order
-   CSS is loaded before components render
-   Easier to manage and debug

### 4. Check for Duplicate Imports

Having the same CSS file imported in multiple places can cause issues. Keep CSS imports centralized in the entry point.

## How to Verify the Fix Worked

1.  **Check the browser DevTools**:

    -   Inspect the `<main>` element
    -   Verify `display: grid` is applied
    -   At ≥1024px width, verify `grid-template-columns: repeat(3, minmax(0, 1fr))` is applied

2.  **Visual check**:

    -   On desktop (≥1024px): Should see 2 columns (TemperatureDisplay on left, StatusIndicators on right)
    -   On mobile/tablet (&lt;1024px): Should see 1 column (stacked)

3.  **Check the bundle**:
    -   Tailwind utility classes should be present in the generated CSS
    -   No CSS conflicts in the browser console

## Files Modified

1.  `app/frontend/entrypoints/application.jsx` - Fixed import order
2.  `app/frontend/Root.jsx` - Removed duplicate import
3.  `vite.config.ts` - Added Tailwind Vite plugin
4.  `package.json` - Added `@tailwindcss/vite` dependency

## Prevention Checklist

When setting up Tailwind CSS in a project, always:

-   [ ] Install `tailwindcss` and `@tailwindcss/vite` packages
-   [ ] Add `tailwindcss()` plugin to `vite.config.ts` plugins array
-   [ ] Create CSS file with `@import "tailwindcss";`
-   [ ] Import Tailwind CSS file BEFORE other CSS frameworks in entry point
-   [ ] Ensure no duplicate CSS imports
-   [ ] Restart dev server after configuration changes
-   [ ] Test responsive breakpoints in browser

## Related Documentation

-   [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
-   [Tailwind CSS Vite Plugin](https://github.com/tailwindlabs/tailwindcss/tree/next/packages/%40tailwindcss-vite)
-   [Rhino UI Overrides Documentation](/blog/2025/11/04/rhino-ui-overrides-part-1-foundations)

## Conclusion

Customizing Rhino's UI requires understanding both the component architecture and the CSS framework configuration. By following these guidelines for component composition, using React hooks effectively, and properly configuring Tailwind CSS v4, you can create a fully customized user interface that maintains compatibility with Rhino's core functionality while matching your design requirements.

The key is to work with Rhino's systems rather than against them - use composition over complete overrides, leverage the provided hooks for data access, and ensure your CSS framework is properly configured from the start.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities._
