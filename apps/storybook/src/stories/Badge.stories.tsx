import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@dsf/react";

const meta = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Compact status label in four semantic tones, colored from `feedback.*` semantic tokens.",
      },
    },
  },
  argTypes: {
    tone: { control: "radio", options: ["neutral", "success", "warning", "danger"] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { children: "Draft" } };

export const Success: Story = { args: { tone: "success", children: "Passed" } };

export const Warning: Story = { args: { tone: "warning", children: "Expiring" } };

export const Danger: Story = { args: { tone: "danger", children: "Failed" } };
