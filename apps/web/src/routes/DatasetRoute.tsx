import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import Panel from "../components/Panel";

const DatasetRoute = () => {
  return (
    <AppShell
      sidebar={
        <div>
          <h3>Datasets</h3>
          <p>No datasets loaded.</p>
        </div>
      }
    >
      <div data-testid="dataset-screen">
        <h1>Datasets</h1>
        <Panel>
          <EmptyState
            title="Import a dataset to begin"
            description="Load a dataset zip to explore it here."
            action={<Link to="/import">Go to import</Link>}
          />
        </Panel>
      </div>
    </AppShell>
  );
};

export default DatasetRoute;
