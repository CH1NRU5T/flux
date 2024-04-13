const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const types = require("@babel/types");

const sourceCodeDir = "./"; // Replace with your source code directory
const outputCodeDir = "./"; // Replace with your desired output directory
const mixpanelEventsFile = "mixpanel-events2.json";

// Ensure the output directory exists
if (!fs.existsSync(outputCodeDir)) {
  fs.mkdirSync(outputCodeDir, { recursive: true });
}

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
    } else if (path.extname(filePath) === ".jsx" || path.extname(filePath) === ".tsx") {
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
      if (
        path.node?.callee?.object?.name === "mixpanel" &&
        path.node?.callee?.property?.name === "track"
      ) {
        const eventName = path.node.arguments[0].value;
        let eventAttributes = path.node.arguments[1];
        if (eventAttributes?.type === "ObjectExpression") {
          eventAttributes = eventAttributes.properties.reduce((acc, prop) => {
            console.log(prop.key.name);
            acc[prop.key.name] = prop.value.value || prop.value.name || prop.value.type;
            return acc;
          }, {});
        } else {
          eventAttributes = {};
        }
        let jsxOpeningElement = path;
        while (
          jsxOpeningElement &&
          jsxOpeningElement?.node?.type !== "JSXOpeningElement"
        ) {
          jsxOpeningElement = jsxOpeningElement?.parentPath;
        }
        // let functionDeclaration = path;
        // while (
        //   functionDeclaration &&
        //   functionDeclaration?.node?.type !== "FunctionDeclaration"
        // ) {
        //   functionDeclaration = functionDeclaration?.parentPath;
        // }
        // let variableDeclarator = path;
        // while (
        //   variableDeclarator &&
        //   variableDeclarator?.node?.type !== "VariableDeclarator"
        // ) {
        //   variableDeclarator = variableDeclarator?.parentPath;
        // }
        if (jsxOpeningElement && jsxOpeningElement.node) {
          const attributes = jsxOpeningElement.node.attributes;
          console.log(attributes);
          const dataIterateAttr = types.jsxAttribute(
            types.jsxIdentifier("iterate-event-name"),
            types.stringLiteral(eventName)
          );
          const dataIterateAttr2 = types.jsxAttribute(
            types.jsxIdentifier("iterate-event-attributes"),
            types.stringLiteral(btoa(JSON.stringify(eventAttributes)))
          );
          attributes.push(dataIterateAttr);
          attributes.push(dataIterateAttr2);
        }
        // console.log(
        //   jsxOpeningElement?.node
        //   // functionDeclaration?.node?.id?.name
        //   // variableDeclarator?.node?.id?.name
        //   // path.parentPath?.parentPath?.parentPath?.parentPath?.node
        // );
      }
    },
  };

  traverse(ast, visitor);

  const { code: modifiedCode } = generate(ast, {}, code);

  const outputFilePath = path.join(outputCodeDir, path.relative(sourceCodeDir, filePath));

  // Ensure the output directory exists
  const outputDirPath = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, modifiedCode);
  console.log(`Processed: ${filePath}`);
}

// Start traversing the source code directory
traverseDirectory(sourceCodeDir);

// Write the mixpanel events to a JSON file
const mixpanelEventsFilePath = path.join(outputCodeDir, mixpanelEventsFile);
fs.writeFileSync(mixpanelEventsFilePath, JSON.stringify(mixpanelEvents, null, 2));
console.log(`Mixpanel events written to: ${mixpanelEventsFilePath}`);
