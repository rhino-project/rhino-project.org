const visit = require("unist-util-visit");

const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

function createRhinoConfigTabs(node, levels) {
  const code = {
    global: `const rhinoConfig = {\n  version: 1,\n  components: {\n    ${node.value}\n  }\n}`,
  };

  code["model"] = code["global"].replace(
    `${node.value}`,
    `blog: {\n      ${node.value}\n    }`
  );

  code["attribute"] = code["model"].replace(
    `${node.value}`,
    `title: {\n        ${node.value}\n      }`
  );

  const tabs = levels.map((level, idx) => ({
    label: capitalize(level),
    value: idx.toString(),
  }));

  const display = [
    {
      type: "jsx",
      value: `<Tabs groupId="rhino-config" defaultValue="1" values={${JSON.stringify(
        tabs
      )}}>`,
    },
  ];

  levels.forEach((level, idx) => {
    display.push({
      type: "jsx",
      value: `<TabItem value="${idx}">`,
    });
    display.push({
      type: "code",
      lang: "javascript",
      value: code[level],
    });
    display.push({
      type: "jsx",
      value: "</TabItem>",
    });
  });

  display.push({
    type: "jsx",
    value: "</Tabs>",
  });

  return display;
}

const isImport = (node) => node.type === "import";
const nodeForImport = {
  type: "import",
  value:
    "import Tabs from '@theme/Tabs';\nimport TabItem from '@theme/TabItem';",
};

const LEVELS = ["global", "model", "attribute"];

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

      let levels = [];
      LEVELS.forEach((l) => {
        if (node.meta.includes(l)) {
          levels.push(l);
        }
      });

      if (levels.length === 0) {
        levels = LEVELS;
      }

      const newNodes = createRhinoConfigTabs(node, levels);
      parent.children.splice(index, 1, ...newNodes);
    });

    if (transformed && !alreadyImported) {
      tree.children.unshift(nodeForImport);
    }
  };
};
