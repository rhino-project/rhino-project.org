/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  // api: [{ type: "autogenerated", dirName: "." }],

  tutorialSidebar: [
    "index",
    {
      type: "category",
      label: "Tutorial",
      link: {
        type: "doc",
        id: "tutorials/index",
      },
      items: [
        "tutorials/advanced",
        "tutorials/nested_resources",
        "tutorials/organization",
        "tutorials/custom_role",
      ],
    },
  ],

  guide: [
    {
      type: "category",
      label: "Upgrading",
      link: {
        type: "doc",
        id: "guides/updating",
      },
      items: ["guides/release_notes"],
    },
    {
      type: "category",
      label: "Deployment",
      link: {
        type: "doc",
        id: "guides/production/deployment",
      },
      items: [
        "guides/production/accounts",
        "guides/production/analytics",
        {
          type: "category",
          label: "Error Reporting",
          link: {
            type: "doc",
            id: "guides/production/error_reporting",
          },
          items: [
            "guides/production/error_reporting_client",
            "guides/production/error_reporting_server",
          ],
        },
      ],
    },
    "guides/properties",
    {
      "UI Customization": [
        "guides/ui/roles",
        {
          type: "category",
          label: "Index page",
          link: {
            type: "doc",
            id: "guides/ui/index_page",
          },
          collapsed: false,
          items: [
            "guides/ui/filters",
            "guides/ui/cells",
            "guides/ui/index_actions",
          ],
        },
        {
          type: "category",
          label: "Show page",
          link: {
            type: "doc",
            id: "guides/ui/show_page",
          },
          collapsed: false,
          items: ["guides/ui/displays", "guides/ui/show_actions"],
        },
        {
          type: "category",
          label: "Create page",
          link: {
            type: "doc",
            id: "guides/ui/create_page",
          },
          collapsed: false,
          items: ["guides/ui/fields", "guides/ui/create_actions"],
        },
        {
          type: "category",
          label: "Edit page",
          link: {
            type: "doc",
            id: "guides/ui/edit_page",
          },
          collapsed: false,
          items: ["guides/ui/fields", "guides/ui/edit_actions"],
        },
        "guides/ui/overrides",
      ],
    },
    "guides/audit_trail",
    "guides/super_admin",
    "guides/jobs",
    "guides/notifications",
    "guides/subscription",
    "guides/geocoding",
    {
      type: "category",
      label: "Importing data",
      link: {
        type: "generated-index",
        title: "Importing Data",
        description: "Learn more about importing data",
        slug: "/guides/importing",
        keywords: ["guides", "importing"],
      },
      items: [
        "guides/importing/importing_google_sheets",
        "guides/importing/importing_excel_csv",
        "guides/importing/importing_scraping",
      ],
    },
    {
      type: "category",
      label: "Development",
      link: {
        type: "generated-index",
        title: "Development",
        description: "Learn more about developing with Rhino",
        slug: "/guides/development",
        keywords: ["guides", "development"],
      },
      items: ["guides/dev_environment", "guides/testing"],
    },
  ],

  concept: [
    "concepts/resources/index",
    {
      type: "category",
      label: "REST API",
      link: {
        type: "doc",
        id: "concepts/rest_api/index",
      },
      items: [
        "concepts/rest_api/filtering",
        "concepts/rest_api/sorting",
        "concepts/rest_api/pagination",
      ],
    },
    "concepts/models_attributes_paths",
    "concepts/components",
    {
      type: "category",
      label: "Authentication",
      link: {
        type: "doc",
        id: "concepts/auth/index",
      },
      items: ["concepts/auth/frontend", "concepts/auth/policies"],
    },
    {
      Extending: ["concepts/extending/modules", "concepts/extending/overrides"],
    },
  ],

  reference: [
    {
      type: "link",
      label: "Backend API",
      href: "https://api.rhino-project.org",
    },
    {
      "Front End": [
        "reference/front_end/api_hooks",
        "reference/front_end/controllers",
        "guides/ui/overrides",
      ],
    },
  ],
};

module.exports = sidebars;
