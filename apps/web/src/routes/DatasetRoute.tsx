import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useDataset } from "../state/DatasetContext";
import type { GraphNode } from "../../../../src/core/graph";

type RecordGroup = { typeId: string; records: GraphNode[] };

export default function DatasetRoute() {
  const { activeDataset, status } = useDataset();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const graph = activeDataset?.parsedGraph;

  const datasetNode = useMemo(() => {
    if (!graph) {
      return undefined;
    }
    return [...graph.nodesById.values()].find((node) => node.kind === "dataset");
  }, [graph]);

  const recordGroups: RecordGroup[] = useMemo(() => {
    if (!graph) {
      return [];
    }
    const groups = new Map<string, GraphNode[]>();
    for (const node of graph.nodesById.values()) {
      if (node.kind !== "record") {
        continue;
      }
      if (!groups.has(node.typeId)) {
        groups.set(node.typeId, []);
      }
      groups.get(node.typeId)?.push(node);
    }
    return [...groups.entries()]
      .map(([typeId, records]) => ({
        typeId,
        records: records.sort((a, b) => a.id.localeCompare(b.id))
      }))
      .sort((a, b) => a.typeId.localeCompare(b.typeId));
  }, [graph]);

  const selectedRecord = useMemo(() => {
    if (!graph || !selectedRecordId) {
      return undefined;
    }
    return graph.nodesById.get(selectedRecordId);
  }, [graph, selectedRecordId]);

  return (
    <AppShell
      sidebar={
        activeDataset ? (
          <div>
            <p>Active dataset:</p>
            <strong>{activeDataset.meta.label ?? activeDataset.meta.id}</strong>
          </div>
        ) : (
          <p>No datasets loaded.</p>
        )
      }
    >
      <section data-testid="dataset-screen" className="dataset-browser">
        <h1>Datasets</h1>
        {activeDataset ? (
          <div className="dataset-summary">
            <p>
              <strong>{activeDataset.meta.label ?? "Imported dataset"}</strong>
            </p>
            <p>Imported at: {new Date(activeDataset.meta.createdAt).toLocaleString()}</p>
            <p>Stored files: {activeDataset.repoSnapshot.files.size}</p>
            <Link to="/import">Import another dataset</Link>
          </div>
        ) : null}

        {graph && datasetNode ? (
          <div className="dataset-browser__content">
            <section className="dataset-browser__panel">
              <h2>{datasetNode.fields.name as string}</h2>
              <p>{datasetNode.fields.description as string}</p>
              <p>
                <strong>ID:</strong> {datasetNode.id}
              </p>
              <p>
                <strong>Created:</strong> {datasetNode.createdAt}
              </p>
              <p>
                <strong>Updated:</strong> {datasetNode.updatedAt}
              </p>
            </section>

            <section className="dataset-browser__panel">
              <h3>Types</h3>
              <ul>
                {[...graph.typesByRecordTypeId.values()].map((type) => {
                  const recordCount = recordGroups.find((group) => group.typeId === type.recordTypeId)
                    ?.records.length;
                  return (
                    <li key={type.recordTypeId}>
                      <strong>{type.recordTypeId}</strong> ({recordCount ?? 0} records)
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="dataset-browser__panel dataset-browser__records">
              <div className="dataset-browser__record-list">
                <h3>Records</h3>
                {recordGroups.length ? (
                  recordGroups.map((group) => (
                    <div key={group.typeId} className="dataset-browser__record-group">
                      <strong>{group.typeId}</strong>
                      <ul>
                        {group.records.map((record) => (
                          <li key={record.id}>
                            <button
                              type="button"
                              className={`record-link ${
                                selectedRecordId === record.id ? "is-active" : ""
                              }`}
                              onClick={() => setSelectedRecordId(record.id)}
                            >
                              {record.id}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p>No records found.</p>
                )}
              </div>
              <div className="dataset-browser__record-detail">
                {selectedRecord ? (
                  <div>
                    <h3>{selectedRecord.id}</h3>
                    <p>
                      <strong>Type:</strong> {selectedRecord.typeId}
                    </p>
                    <p>
                      <strong>Created:</strong> {selectedRecord.createdAt}
                    </p>
                    <p>
                      <strong>Updated:</strong> {selectedRecord.updatedAt}
                    </p>
                    <h4>Fields</h4>
                    <pre>{JSON.stringify(selectedRecord.fields, null, 2)}</pre>
                    <h4>Body</h4>
                    <pre>{selectedRecord.body || "(empty)"}</pre>
                    <h4>Links</h4>
                    <p>
                      <strong>Outgoing:</strong>{" "}
                      {graph.getLinksFrom(selectedRecord.id).join(", ") || "None"}
                    </p>
                    <p>
                      <strong>Incoming:</strong>{" "}
                      {graph.getLinksTo(selectedRecord.id).join(", ") || "None"}
                    </p>
                  </div>
                ) : (
                  <p>Select a record to view details.</p>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {!activeDataset ? (
          <EmptyState title={status === "loading" ? "Loading dataset..." : "Import a dataset to begin"}>
            <Link to="/import">Go to import</Link>
          </EmptyState>
        ) : null}
      </section>
    </AppShell>
  );
}
