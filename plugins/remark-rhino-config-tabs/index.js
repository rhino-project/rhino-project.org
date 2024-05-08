import { visit } from "unist-util-visit";

const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

const isMdxEsmLiteral = (node) => node.type === "mdxjsEsm";
// TODO legacy approximation, good-enough for now but not 100% accurate
const isTabsImport = (node) =>
  isMdxEsmLiteral(node) && node.value.includes("@theme/Tabs");

function createRhinoConfigTabs(node, levels, model, attribute) {
  const code = {
    global: `const rhinoConfig = {\n  version: 1,\n  components: {\n    ${node.value}\n  }\n}`,
  };

  code["model"] = code["global"].replace(
    `${node.value}`,
    `${model}: {\n      ${node.value}\n    }`
  );

  code["attribute"] = code["model"].replace(
    `${node.value}`,
    `${attribute}: {\n        ${node.value}\n      }`
  );

  const tabs = levels.map((level, idx) => ({
    label: capitalize(level),
    value: idx.toString(),
  }));

  const display = [];

  return {
    type: "mdxJsxFlowElement",
    name: "Tabs",
    attributes: [
      { type: "mdxJsxAttribute", name: "groupId", value: "rhino-config" },
    ],
    children: levels.map((level, idx) => {
      return {
        type: "mdxJsxFlowElement",
        name: "TabItem",
        attributes: [
          { type: "mdxJsxAttribute", name: "value", value: idx.toString() },
          { type: "mdxJsxAttribute", name: "label", value: capitalize(level) },
        ],
        children: [
          {
            type: "code",
            lang: "javascript",
            value: code[level],
          },
        ],
      };
    }),
  };
}

export default function remarkRhinoConfigTabs() {
  return (tree) => {
    let transformed = false;
    let alreadyImported = false;

    visit(tree, "code", (node, index, parent) => {
      const match = node.lang && node.lang.match(/^rhinoconfig$/);
      if (!match) {
        return;
      }

      if (isTabsImport(node)) {
        alreadyImported = true;
      }
      transformed = true;

      let levels = ["global", "model", "attribute"];
      const levelMatch = node.meta?.match(/levels=([\w,]+)/);
      if (levelMatch) {
        levels = levelMatch[1].split(",");
      }

      let model = "blog";
      const modelMatch = node.meta?.match(/model=(\w+)/);
      if (modelMatch) {
        model = modelMatch[1];
      }

      let attribute = "title";
      const attributeMatch = node.meta?.match(/attribute=(\w+)/);
      if (attributeMatch) {
        attribute = attributeMatch[1];
      }

      const newNodes = createRhinoConfigTabs(node, levels, model, attribute);
      parent.children.splice(index, 1, newNodes);
    });

    if (transformed && !alreadyImported) {
      tree.children.unshift({
        type: "mdxjsEsm",
        value:
          "import Tabs from '@theme/Tabs'\nimport TabItem from '@theme/TabItem'",
        data: {
          estree: {
            type: "Program",
            body: [
              {
                type: "ImportDeclaration",
                specifiers: [
                  {
                    type: "ImportDefaultSpecifier",
                    local: { type: "Identifier", name: "Tabs" },
                  },
                ],
                source: {
                  type: "Literal",
                  value: "@theme/Tabs",
                  raw: "'@theme/Tabs'",
                },
              },
              {
                type: "ImportDeclaration",
                specifiers: [
                  {
                    type: "ImportDefaultSpecifier",
                    local: { type: "Identifier", name: "TabItem" },
                  },
                ],
                source: {
                  type: "Literal",
                  value: "@theme/TabItem",
                  raw: "'@theme/TabItem'",
                },
              },
            ],
            sourceType: "module",
          },
        },
      });
    }
  };
}
