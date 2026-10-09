import { useEffect } from "react";
import { Badge, Button, Card, TextField } from "@dsf/react";
import { iterationInfos } from "../source";
import "./docs.css";

function Samples() {
  return (
    <div className="dsf-compare__samples">
      <Card>
        <h4 className="dsf-compare__card-title">Card</h4>
        <p className="dsf-compare__card-body">
          Content grouped on a raised surface, from the same component build.
        </p>
        <div className="dsf-compare__badges">
          <Badge>Neutral</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
        </div>
      </Card>
      <div className="dsf-compare__buttons">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
      </div>
      <TextField label="Email address" placeholder="you@example.com" />
      <TextField
        label="Email address"
        defaultValue="not-an-email"
        error="Enter a valid email address."
      />
    </div>
  );
}

/**
 * Side-by-side rendering of the four components under core and every
 * iteration. Columns carry the data-iteration attribute directly — the same
 * runtime switch the toolbar uses on &lt;html&gt; — so one component build
 * demonstrably serves every iteration with zero code changes.
 */
export function IterationComparison() {
  // The comparison renders every column explicitly; a stale data-iteration
  // left on <html> by a previous story visit would re-map the core column.
  useEffect(() => {
    delete document.documentElement.dataset.iteration;
  }, []);
  const columns = [
    { id: "core", label: "Core" },
    ...iterationInfos.map((iteration) => ({ id: iteration.id, label: iteration.label })),
  ];
  return (
    <div className="dsf-compare">
      {columns.map((column) => (
        <section
          key={column.id}
          className="dsf-compare__column"
          data-iteration={column.id === "core" ? undefined : column.id}
        >
          <h3>{column.label}</h3>
          <Samples />
        </section>
      ))}
    </div>
  );
}
