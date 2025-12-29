import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";

export default function DatasetRoute() {
  return (
    <AppShell sidebar={<p>No datasets loaded.</p>}>
      <section data-testid="dataset-screen">
        <h1>Datasets</h1>
        <EmptyState title="Import a dataset to begin">
          <Link to="/import">Go to import</Link>
        </EmptyState>
      </section>
    </AppShell>
  );
}
