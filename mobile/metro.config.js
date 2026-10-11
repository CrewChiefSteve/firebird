// The app shares the web app's Convex functions (../convex) and project copy (../lib),
// so Metro has to watch those folders. Packages those shared files import ("convex/server")
// resolve from mobile/node_modules, the same locally as on EAS, where the repo root is never installed.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [path.join(repoRoot, "convex"), path.join(repoRoot, "lib")];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const outside = path.relative(projectRoot, context.originModulePath).startsWith("..");
  const bare = !moduleName.startsWith(".") && !path.isAbsolute(moduleName);
  if (outside && bare) {
    return context.resolveRequest({ ...context, originModulePath: path.join(projectRoot, "package.json") }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
