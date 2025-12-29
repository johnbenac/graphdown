import { useState } from "react";
import AppShell from "../components/AppShell";
import Button from "../components/Button";

export default function ImportRoute() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <AppShell sidebar={<p>No datasets loaded.</p>}>
      <section className="import-stack" data-testid="import-screen">
        <h1>Import</h1>
        <p>Upload a dataset zip to browse.</p>
        <label className="file-input">
          <input
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFileName(file ? file.name : null);
            }}
          />
        </label>
        <div className="file-row">
          <span className="file-name">
            {fileName ? `Selected file: ${fileName}` : "No file selected"}
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFileName(null)}
            disabled={!fileName}
          >
            Clear
          </Button>
        </div>
        <Button type="button" disabled>
          Import
        </Button>
      </section>
    </AppShell>
  );
}
