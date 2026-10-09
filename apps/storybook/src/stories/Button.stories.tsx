import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@dsf/react";

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Action button in three semantic variants. Colors flow from `action.*` semantic tokens only — one build serves every iteration.",
      },
    },
  },
  argTypes: {
    variant: { control: "radio", options: ["primary", "secondary", "danger"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { children: "Save changes" } };

export const Secondary: Story = { args: { variant: "secondary", children: "Cancel" } };

export const Danger: Story = { args: { variant: "danger", children: "Delete" } };
