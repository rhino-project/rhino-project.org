const visit = require("unist-util-visit");

function createRhinoConfigTabs(node) {
  const code1 = `const rhinoConfig = {\n  version: 1,\n  components: {\n    ${node.value}\n  }\n}`;
  const code2 = code1.replace(
    `${node.value}`,
    `blog: {\n      ${node.value}\n    }`
  );
  const code3 = code2.replace(
    `${node.value}`,
    `title: {\n        ${node.value}\n      }`
  );

  return [
    {
      type: "jsx",
      value:
        '<Tabs groupId="rhino-config" defaultValue="1" values={[{label: "Global", value: "1"}, {label: "Model", value: "2"}, {label: "Attribute", value: "3"}]}>',
    },
    {
      type: "jsx",
      value: `<TabItem value="1">`,
    },
    {
      type: "code",
      lang: "jsx",
      value: code1,
    },
    {
      type: "jsx",
      value: "</TabItem>",
    },
    {
      type: "jsx",
      value: `<TabItem value="2">`,
    },
    {
      type: "code",
      lang: "javascript",
      value: code2,
    },
    {
      type: "jsx",
      value: "</TabItem>",
    },
    {
      type: "jsx",
      value: `<TabItem value="3">`,
    },
    {
      type: "code",
      lang: "javascript",
      value: code3,
    },
    {
      type: "jsx",
      value: "</TabItem>",
    },
    {
      type: "jsx",
      value: "</Tabs>",
    },
  ];
}

const isImport = (node) => node.type === "import";
const nodeForImport = {
  type: "import",
  value:
    "import Tabs from '@theme/Tabs';\nimport TabItem from '@theme/TabItem';",
};

module.exports = function remarkRhinoConfigTabs() {
  return (tree) => {
    let transformed = false;
    let alreadyImported = false;

    visit(tree, "code", (node, index, parent) => {
      const match = node.lang && node.lang.match(/^rhinoconfig$/);
      if (!match) {
        return;
      }

      if (isImport(node) && node.value.includes("@theme/Tabs")) {
        alreadyImported = true;
      }
      transformed = true;

      const newNodes = createRhinoConfigTabs(node);
      parent.children.splice(index, 1, ...newNodes);
    });

    if (transformed && !alreadyImported) {
      tree.children.unshift(nodeForImport);
    }
  };
};
