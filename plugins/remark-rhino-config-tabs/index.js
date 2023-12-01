const visit = require("unist-util-visit");

const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

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

      let levels = LEVELS;
      const levelMatch = node.meta.match(/levels=([\w,]+)/);
      if (levelMatch) {
        levels = levelMatch[1].split(",");
      }

      let model = "blog";
      const modelMatch = node.meta.match(/model=(\w+)/);
      if (modelMatch) {
        model = modelMatch[1];
      }

      // If node.meta includes "attribute=" then we want to use that as the attribute
      // name instead of the default "title".
      let attribute = "title";
      const attributeMatch = node.meta.match(/attribute=(\w+)/);
      if (attributeMatch) {
        attribute = attributeMatch[1];
      }

      const newNodes = createRhinoConfigTabs(node, levels, model, attribute);
      parent.children.splice(index, 1, ...newNodes);
    });

    if (transformed && !alreadyImported) {
      tree.children.unshift(nodeForImport);
    }
  };
};
