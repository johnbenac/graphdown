import { useState } from "react";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import Panel from "../components/Panel";

const ImportRoute = () => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFileName(file ? file.name : null);
  };

  const clearSelection = () => {
    setSelectedFileName(null);
  };

  return (
    <AppShell>
      <div data-testid="import-screen">
        <h1>Import</h1>
        <Panel title="Upload dataset">
          <p>Upload a dataset zip to browse.</p>
          <div className="file-row">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              aria-label="Dataset file"
            />
            <Button type="button" variant="secondary" onClick={clearSelection} disabled={!selectedFileName}>
              Clear
            </Button>
          </div>
          <p>
            Selected file: <strong>{selectedFileName ?? "None"}</strong>
          </p>
          <div>
            <Button type="button" disabled>
              Import
            </Button>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
};

export default ImportRoute;
