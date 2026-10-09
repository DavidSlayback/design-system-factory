import { useEffect } from "react";
import type { Decorator, Preview } from "@storybook/react-vite";
import { iterationSwitcherItems } from "../src/source";
import "../src/token-docs/docs.css";

/**
 * Applies the iteration global to <html data-iteration="…"> in the preview
 * iframe. Core removes the attribute entirely — base.css's :root values are
 * the core mapping, and iteration CSS only ever re-maps under an attribute.
 * Cleanup removes the attribute when the story unmounts so MDX docs pages
 * always render with core ambient values.
 */
const withIteration: Decorator = (Story, context) => {
  const iteration =
    typeof context.globals["dsfIteration"] === "string" ? context.globals["dsfIteration"] : "core";

  useEffect(() => {
    const root = document.documentElement;
    if (iteration === "core") delete root.dataset.iteration;
    else root.dataset.iteration = iteration;
    return () => {
      delete root.dataset.iteration;
    };
  }, [iteration]);

  // Story canvases sit on the iteration's own surface/content colors; docs
  // pages keep Storybook's chrome and read contrast from their wrappers.
  useEffect(() => {
    if (context.viewMode !== "story") return;
    document.body.style.background = "var(--ds-surface-default)";
    document.body.style.color = "var(--ds-content-primary)";
  }, [context.viewMode, iteration]);

  return <Story />;
};

const preview: Preview = {
  parameters: {
    layout: "padded",
  },
  globalTypes: {
    dsfIteration: {
      description: "Design language iteration",
      toolbar: {
        title: "Iteration",
        icon: "paintbrush",
        dynamicTitle: true,
        // core + every emitted iteration, read from the token source at
        // build time.
        items: iterationSwitcherItems,
      },
    },
  },
  decorators: [withIteration],
};

export default preview;
