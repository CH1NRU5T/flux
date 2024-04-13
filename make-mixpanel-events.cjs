const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const sourceCodeDir = "./"; // Replace with the path to your source code directory
const outputFilePath = "./mixpanel-events.json";

const mixpanelEvents = {};

// Traverse the source code directory
function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (file === "node_modules") {
      // Ignore the node_modules directory
      return;
    }
    if (fs.statSync(filePath).isDirectory()) {
      traverseDirectory(filePath);
    } else if (
      path.extname(filePath) === ".js" ||
      path.extname(filePath) === ".jsx" ||
      path.extname(filePath) === ".ts" ||
      path.extname(filePath) === ".tsx"
    ) {
      processFile(filePath);
    }
  });
}

// Process a single file
function processFile(filePath) {
  const code = fs.readFileSync(filePath, "utf-8");
  const ast = parser.parse(code, {
    sourceType: "unambiguous",
    plugins: ["jsx", "typescript"],
  });

  const visitor = {
    CallExpression(path) {
      const callee = path.node.callee;
      if (
        callee.object &&
        callee.object.name === "mixpanel" &&
        callee.property &&
        callee.property.name === "track"
      ) {
        const eventName = path.node.arguments[0].value;
        let attributes = path.node.arguments[1];
        if (attributes?.type === "ObjectExpression") {
          attributes = attributes.properties.reduce((acc, prop) => {
            console.log(prop.key.name);
            acc[prop.key.name] = prop.value.value || prop.value.name || prop.value.type;
            return acc;
          }, {});
        } else {
          attributes = {};
        }
        if (!mixpanelEvents[filePath]) {
          mixpanelEvents[filePath] = {};
        }
        mixpanelEvents[filePath][eventName] = attributes;
      }
    },
  };

  traverse(ast, visitor);
}

// Start traversing the source code directory
traverseDirectory(sourceCodeDir);

// Write the mixpanel events to a JSON file
fs.writeFileSync(outputFilePath, JSON.stringify(mixpanelEvents, null, 2));
console.log(`Mixpanel events written to ${outputFilePath}`);
