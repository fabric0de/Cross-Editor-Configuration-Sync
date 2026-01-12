const esbuild = require("esbuild");
const path = require("path");

const args = process.argv.slice(2);
const watch = args.includes("--watch");

/**
 * @type {import('esbuild').BuildOptions}
 */
const config = {
    bundle: true,
    entryPoints: ["./src/extension.ts"],
    outfile: "dist/extension.js",
    external: ["vscode"],
    format: "cjs",
    platform: "node",
    target: "node16",
    minify: !watch,
    sourcemap: watch,
    logLevel: "info",
    mainFields: ["module", "main"],
    // Explicitly point to ESM version of jsonc-parser if it helps
    alias: {
        "jsonc-parser": path.resolve(__dirname, "node_modules/jsonc-parser/lib/esm/main.js"),
    },
};

async function main() {
    if (watch) {
        const ctx = await esbuild.context(config);
        await ctx.watch();
    } else {
        await esbuild.build(config);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
