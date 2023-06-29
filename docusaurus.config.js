// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion
const rhinoconfig = require("./plugins/remark-rhino-config-tabs");
const npm2yarn = require("@docusaurus/remark-plugin-npm2yarn");

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Rhino Project",
  tagline:
    "The powerful and flexible real code platform to build complete full stack applications",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://www.rhino-project.org",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "rhino-project", // Usually your GitHub org/user name.
  projectName: "rhino-project.org", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid", "@easyops-cn/docusaurus-search-local"],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl:
            "https://github.com/rhino-project/rhino-project.org/tree/main/",
          lastVersion: "current",
          versions: {
            current: {
              label: "v3.0",
            },
            "2.0": {
              label: "v2.0",
              banner: "none",
            },
          },
          remarkPlugins: [rhinoconfig, [npm2yarn, { sync: true }]],
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "Rhino Project",
        logo: {
          alt: "Rhino Project Logo",
          src: "img/rhino-red.svg",
        },
        items: [
          {
            type: "doc",
            docId: "index",
            position: "left",
            label: "Tutorials",
          },
          {
            type: "docSidebar",
            position: "left",
            sidebarId: "guide",
            label: "Guides",
          },
          {
            type: "docSidebar",
            position: "left",
            sidebarId: "concept",
            label: "Concepts",
          },
          {
            type: "docSidebar",
            position: "left",
            sidebarId: "reference",
            label: "Reference",
          },
          {
            type: "docsVersionDropdown",
            position: "right",
          },
          {
            href: "https://github.com/rhino-project",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Tutorial",
                to: "/docs/tutorials/index",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Nubinary, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ["ruby", "erb"],
      },
    }),
};

module.exports = config;
