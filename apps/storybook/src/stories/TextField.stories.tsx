import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextField } from "@dsf/react";

const meta = {
  title: "Components/TextField",
  component: TextField,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Labeled text input. The label is always rendered and associated; `error` marks the input invalid and links the message via `aria-describedby`.",
      },
    },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { label: "Email address", placeholder: "you@example.com" } };

export const WithError: Story = {
  args: {
    label: "Email address",
    defaultValue: "not-an-email",
    error: "Enter a valid email address.",
  },
};
