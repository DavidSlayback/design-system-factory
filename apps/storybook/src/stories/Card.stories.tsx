import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, Button, Card } from "@dsf/react";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Raised surface for grouping related content. Colors flow from `surface.*`, `border.*`, and `content.*` semantic tokens.",
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <h3 style={{ marginTop: 0 }}>Card title</h3>
        <p style={{ marginBottom: "0.75rem" }}>Related content grouped on a raised surface.</p>
        <Button variant="secondary">Learn more</Button>
      </>
    ),
  },
};

export const WithBadges: Story = {
  args: {
    children: (
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Badge>Neutral</Badge>
        <Badge tone="success">Success</Badge>
        <Badge tone="warning">Warning</Badge>
        <Badge tone="danger">Danger</Badge>
      </div>
    ),
  },
};
