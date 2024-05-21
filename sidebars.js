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
    "getting_started",
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
        "guides/production/apm",
      ],
    },
    "guides/properties",
    {
      type: "category",
      label: "UI Customization",
      link: {
        type: "generated-index",
        title: "UI Customization",
        description:
          "Learn more about customizing the UI based on user interface concepts",
        slug: "/guides/ui_customization",
        keywords: ["guides", "importing"],
      },
      items: [
        "guides/ui/general",
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
        "guides/ui/roles",
      ],
    },
    "guides/audit_trail",
    "guides/file_storage",
    "guides/geocoding",
    "guides/jobs",
    "guides/notifications",
    "guides/search",
    "guides/subscription",
    "guides/super_admin",
    "guides/websockets",
    {
      type: "category",
      label: "Seeding & Importing Data",
      link: {
        type: "generated-index",
        title: "Importing Data",
        description: "Learn more about importing data",
        slug: "/guides/importing",
        keywords: ["guides", "importing"],
      },
      items: [
        "guides/importing/seeding",
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
      items: [
        "guides/dev_environment",
        "guides/testing",
        "guides/maintenance",
        "guides/development/dev_tool",
      ],
    },
    "guides/faq",
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
        "concepts/rest_api/searching",
      ],
    },
    "concepts/ui",
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
    {
      Design: ["concepts/design/overview"],
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
      ],
    },
  ],
};

module.exports = sidebars;
