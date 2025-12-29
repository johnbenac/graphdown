import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useDataset } from "../state/DatasetContext";

export default function DatasetRoute() {
  const { activeDataset, status } = useDataset();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const graph = activeDataset?.parsedGraph;
  const datasetNode = useMemo(() => {
    if (!graph) {
      return null;
    }
    for (const node of graph.nodesById.values()) {
      if (node.kind === "dataset") {
        return node;
      }
    }
    return null;
  }, [graph]);

  const types = useMemo(() => {
    if (!graph) {
      return [];
    }
    return [...graph.typesByRecordTypeId.values()].sort((a, b) =>
      a.recordTypeId.localeCompare(b.recordTypeId)
    );
  }, [graph]);

  const recordsByType = useMemo(() => {
    if (!graph) {
      return new Map<string, string[]>();
    }
    const map = new Map<string, string[]>();
    for (const node of graph.nodesById.values()) {
      if (node.kind !== "record") {
        continue;
      }
      const list = map.get(node.typeId) ?? [];
      list.push(node.id);
      map.set(node.typeId, list);
    }
    for (const [key, list] of map) {
      list.sort((a, b) => a.localeCompare(b));
      map.set(key, list);
    }
    return map;
  }, [graph]);

  const selectedRecord = selectedRecordId ? graph?.nodesById.get(selectedRecordId) ?? null : null;
  const selectedType = selectedRecord ? graph?.getTypeForRecord(selectedRecord.id) : null;

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
      <section data-testid="dataset-screen">
        <h1>Datasets</h1>
        {activeDataset ? (
          <div className="dataset-summary">
            <p>
              <strong>{activeDataset.meta.label ?? "Imported dataset"}</strong>
            </p>
            <p>Imported at: {new Date(activeDataset.meta.createdAt).toLocaleString()}</p>
            <p>Stored files: {activeDataset.repoSnapshot.files.size}</p>
            <Link to="/import">Import another dataset</Link>
            {graph ? (
              <div className="dataset-browser">
                <div className="dataset-overview">
                  <h2>Dataset details</h2>
                  {datasetNode ? (
                    <>
                      <p className="dataset-title">{String(datasetNode.fields.name ?? "Untitled dataset")}</p>
                      <p className="dataset-description">
                        {String(datasetNode.fields.description ?? "No description provided.")}
                      </p>
                      <div className="dataset-meta">
                        <span>ID: {datasetNode.id}</span>
                        <span>Created: {datasetNode.createdAt}</span>
                        <span>Updated: {datasetNode.updatedAt}</span>
                      </div>
                    </>
                  ) : (
                    <p>No dataset record found in the graph.</p>
                  )}
                </div>
                <div className="dataset-grid">
                  <div className="dataset-panel">
                    <h2>Types</h2>
                    {types.length ? (
                      <ul>
                        {types.map((type) => (
                          <li key={type.recordTypeId}>
                            <strong>{type.recordTypeId}</strong>{" "}
                            <span className="muted">
                              ({recordsByType.get(type.recordTypeId)?.length ?? 0} records)
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No types found.</p>
                    )}
                  </div>
                  <div className="dataset-panel">
                    <h2>Records</h2>
                    {types.length ? (
                      <div className="record-groups">
                        {types.map((type) => (
                          <div key={type.recordTypeId} className="record-group">
                            <h3>{type.recordTypeId}</h3>
                            <ul>
                              {(recordsByType.get(type.recordTypeId) ?? []).map((recordId) => (
                                <li key={recordId}>
                                  <button
                                    type="button"
                                    className={`record-link ${
                                      recordId === selectedRecordId ? "active" : ""
                                    }`}
                                    onClick={() => setSelectedRecordId(recordId)}
                                  >
                                    {recordId}
                                  </button>
                                </li>
                              ))}
                              {(recordsByType.get(type.recordTypeId) ?? []).length === 0 ? (
                                <li className="muted">No records in this type.</li>
                              ) : null}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No record types available.</p>
                    )}
                  </div>
                  <div className="dataset-panel">
                    <h2>Record details</h2>
                    {selectedRecord ? (
                      <div className="record-details">
                        <p>
                          <strong>{selectedRecord.id}</strong>
                        </p>
                        <p className="muted">Type: {selectedRecord.typeId}</p>
                        <p className="muted">Created: {selectedRecord.createdAt}</p>
                        <p className="muted">Updated: {selectedRecord.updatedAt}</p>
                        {selectedType ? (
                          <p className="muted">Type record: {selectedType.typeRecordId}</p>
                        ) : null}
                        <h3>Fields</h3>
                        <pre>{JSON.stringify(selectedRecord.fields ?? {}, null, 2)}</pre>
                        <h3>Body</h3>
                        <pre>{selectedRecord.body || "No body content."}</pre>
                        <div className="record-links">
                          <div>
                            <h4>Outgoing links</h4>
                            <ul>
                              {graph?.getLinksFrom(selectedRecord.id).map((link) => (
                                <li key={`out-${link}`}>{link}</li>
                              ))}
                              {graph?.getLinksFrom(selectedRecord.id).length === 0 ? (
                                <li className="muted">None</li>
                              ) : null}
                            </ul>
                          </div>
                          <div>
                            <h4>Incoming links</h4>
                            <ul>
                              {graph?.getLinksTo(selectedRecord.id).map((link) => (
                                <li key={`in-${link}`}>{link}</li>
                              ))}
                              {graph?.getLinksTo(selectedRecord.id).length === 0 ? (
                                <li className="muted">None</li>
                              ) : null}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p>Select a record to view its details.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState title={status === "loading" ? "Loading dataset..." : "Import a dataset to begin"}>
            <Link to="/import">Go to import</Link>
          </EmptyState>
        )}
      </section>
    </AppShell>
  );
}
