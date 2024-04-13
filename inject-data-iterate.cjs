const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const types = require("@babel/types");

const sourceCodeDir = "./";
const outputCodeDir = "./";

// Ensure the output directory exists
if (!fs.existsSync(outputCodeDir)) {
  fs.mkdirSync(outputCodeDir, { recursive: true });
}

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
    JSXElement(path) {
      const openingElement = path.node.openingElement;
      const attributes = openingElement.attributes;
      // console.log(attributes);
      const dataIterateAttr = types.jsxAttribute(
        types.jsxIdentifier("data-iterate"),
        types.stringLiteral(filePath)
      );
      attributes.push(dataIterateAttr);
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
