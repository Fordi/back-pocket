let escape = (RegExp as any).escape;
if (!escape) {
  escape = await import("./escapeRegExp.js");
}

export { escape };
