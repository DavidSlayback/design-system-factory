import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)", "../src/**/*.mdx"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  // Token sources and generated CSS live outside the app root (monorepo
  // packages) — allow the dev server to serve them so build-time glob
  // imports also work under `storybook dev`.
  viteFinal: async (config) => {
    config.server ??= {};
    config.server.fs ??= {};
    config.server.fs.allow = [...(config.server.fs.allow ?? []), "../../.."];
    return config;
  },
};

export default config;
