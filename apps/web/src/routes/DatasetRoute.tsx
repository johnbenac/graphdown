import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { GraphNode } from "../../../../src/core/graph";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import { useDataset } from "../state/DatasetContext";

type RecordGroup = {
  recordTypeId: string;
  records: GraphNode[];
};

export default function DatasetRoute() {
  const { activeDataset, status } = useDataset();
  const graph = activeDataset?.parsedGraph;
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const datasetNode = useMemo(() => {
    if (!graph) {
      return undefined;
    }
    return [...graph.nodesById.values()].find((node) => node.kind === "dataset");
  }, [graph]);

  const recordGroups = useMemo<RecordGroup[]>(() => {
    if (!graph) {
      return [];
    }
    const groups = new Map<string, GraphNode[]>();
    for (const node of graph.nodesById.values()) {
      if (node.kind !== "record") {
        continue;
      }
      const list = groups.get(node.typeId) ?? [];
      list.push(node);
      groups.set(node.typeId, list);
    }
    return [...groups.entries()]
      .map(([recordTypeId, records]) => ({
        recordTypeId,
        records: records.sort((a, b) => a.id.localeCompare(b.id))
      }))
      .sort((a, b) => a.recordTypeId.localeCompare(b.recordTypeId));
  }, [graph]);

  const selectedRecord = useMemo(() => {
    if (!graph || !selectedRecordId) {
      return undefined;
    }
    return graph.nodesById.get(selectedRecordId);
  }, [graph, selectedRecordId]);

  useEffect(() => {
    if (!graph) {
      setSelectedRecordId(null);
      return;
    }
    if (selectedRecordId && graph.nodesById.has(selectedRecordId)) {
      return;
    }
    const firstRecord = recordGroups[0]?.records[0];
    setSelectedRecordId(firstRecord?.id ?? null);
  }, [graph, recordGroups, selectedRecordId]);

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
          graph ? (
            <>
              <div className="dataset-summary">
                <p className="dataset-summary__name">
                  <strong>{datasetNode?.fields.name ?? activeDataset.meta.label ?? "Dataset"}</strong>
                </p>
                {datasetNode?.fields.description ? (
                  <p className="dataset-summary__description">{String(datasetNode.fields.description)}</p>
                ) : null}
                <p>ID: {datasetNode?.id ?? activeDataset.meta.id}</p>
                <p>Imported at: {new Date(activeDataset.meta.createdAt).toLocaleString()}</p>
                <p>Stored files: {activeDataset.repoSnapshot.files.size}</p>
                <Link to="/import">Import another dataset</Link>
              </div>

              <div className="dataset-types">
                <h2>Types</h2>
                <ul>
                  {[...graph.typesByRecordTypeId.values()]
                    .sort((a, b) => a.recordTypeId.localeCompare(b.recordTypeId))
                    .map((type) => {
                      const count =
                        recordGroups.find((group) => group.recordTypeId === type.recordTypeId)?.records
                          .length ?? 0;
                      return (
                        <li key={type.recordTypeId}>
                          <strong>{type.recordTypeId}</strong> ({count} records)
                        </li>
                      );
                    })}
                </ul>
              </div>

              <div className="record-browser">
                <div className="record-browser__list">
                  <h2>Records</h2>
                  {recordGroups.length ? (
                    recordGroups.map((group) => (
                      <div key={group.recordTypeId} className="record-group">
                        <h3>{group.recordTypeId}</h3>
                        <ul>
                          {group.records.map((record) => (
                            <li key={record.id}>
                              <button
                                type="button"
                                className={`record-button${
                                  record.id === selectedRecordId ? " is-active" : ""
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
                <div className="record-browser__detail">
                  {selectedRecord ? (
                    <>
                      <h2>Record details</h2>
                      <p>
                        <strong>{selectedRecord.id}</strong>
                      </p>
                      <p>Type: {selectedRecord.typeId}</p>
                      <p>Created: {selectedRecord.createdAt}</p>
                      <p>Updated: {selectedRecord.updatedAt}</p>
                      <div className="record-section">
                        <h3>Fields</h3>
                        <pre>{JSON.stringify(selectedRecord.fields, null, 2)}</pre>
                      </div>
                      <div className="record-section">
                        <h3>Body</h3>
                        <pre>{selectedRecord.body || "No body content."}</pre>
                      </div>
                      <div className="record-section">
                        <h3>Links</h3>
                        <div className="record-links">
                          <div>
                            <strong>Outgoing</strong>
                            <ul>
                              {graph.getLinksFrom(selectedRecord.id).map((id) => (
                                <li key={`out-${id}`}>{id}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <strong>Incoming</strong>
                            <ul>
                              {graph.getLinksTo(selectedRecord.id).map((id) => (
                                <li key={`in-${id}`}>{id}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p>Select a record to view details.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="dataset-summary">
              <p>
                <strong>{activeDataset.meta.label ?? "Imported dataset"}</strong>
              </p>
              <p>Imported at: {new Date(activeDataset.meta.createdAt).toLocaleString()}</p>
              <p>Stored files: {activeDataset.repoSnapshot.files.size}</p>
              <Link to="/import">Import another dataset</Link>
            </div>
          )
        ) : (
          <EmptyState title={status === "loading" ? "Loading dataset..." : "Import a dataset to begin"}>
            <Link to="/import">Go to import</Link>
          </EmptyState>
        )}
      </section>
    </AppShell>
  );
}
