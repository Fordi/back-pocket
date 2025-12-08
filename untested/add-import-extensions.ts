import ts from "typescript";
import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";

const isRelative = (path: string) => /^\.{1,2}\//.test(path);

const locate = (from: string, to: string) => {
  const suffixes = ["/index.ts", "/index.js", ".ts", ".js", ""];
  for (const suffix of suffixes) {
    const newSpecifier = `${to}${suffix}`;
    if (existsSync(join(from, newSpecifier))) {
      return newSpecifier;
    }
  }
  throw new Error(`Couldn't locate ${to}`);
};

const isCallImport = (node: ts.Node): node is ts.CallExpression => {
  if (!ts.isCallExpression(node)) {
    return false;
  }
  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return true;
  }
  if (
    node.expression.kind === ts.SyntaxKind.Identifier &&
    (node.expression as ts.Identifier).text === "require" &&
    node.arguments.length > 0
  ) {
    return true;
  }
  return false;
};

const resolveExtensions =
  (dirPath: string) => (context: ts.TransformationContext) => {
    return (rootNode: ts.Node) => {
      function visit(node: ts.Node) {
        ts.visitEachChild(node, visit, context);
        if (ts.isImportDeclaration(node)) {
          const to = (node.moduleSpecifier as ts.StringLiteral).text;
          if (isRelative(to)) {
            const newLoc = locate(dirPath, to);
            (node.moduleSpecifier as ts.StringLiteral).text = newLoc;
          }
        } else if (isCallImport(node)) {
          const to = (
            (node as ts.CallExpression).arguments[0] as ts.StringLiteral
          ).text;
          if (isRelative(to)) {
            const newLoc = locate(dirPath, to);
            (
              (node as ts.CallExpression).arguments[0] as ts.StringLiteral
            ).text = newLoc;
          }
        }
        return node;
      }
      return ts.visitNode(rootNode, visit) as ts.Node;
    };
  };

const updateFileImports = (filePath: string) => {
  if (existsSync(filePath)) {
    console.log(filePath);
    const source = readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
    );

    const dirPath = dirname(filePath);

    ts.transform(sourceFile, [resolveExtensions(dirPath)]);

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const newSource = printer.printFile(sourceFile);
    writeFileSync(filePath, newSource, "utf8");
  } else {
    console.error(`File not found: ${filePath}`);
    console.log(
      "Please update 'targetFilePath' to point to an existing .ts or .js file.",
    );
  }
};

for (const entry of readdirSync(".", { recursive: true, withFileTypes: true })) {
  if (entry.isDirectory()) {
    continue;
  }
  const file = join(entry.parentPath, entry.name);
  if (!/\.[jtm]sx?$/.test(file as string)) {
    continue;
  }
  if (/(^|\/|\\)(node_modules|build|ThirdParty|coverage)[\\\/]/.test(file as string)) {
    continue;
  }
  updateFileImports(file as string);
}
