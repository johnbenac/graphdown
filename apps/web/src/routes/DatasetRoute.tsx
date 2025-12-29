import { useEffect, useMemo, useState } from "react";
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
      return undefined;
    }
    return [...graph.nodesById.values()].find((node) => node.kind === "dataset");
  }, [graph]);

  const typeSummaries = useMemo(() => {
    if (!graph) {
      return [];
    }
    return [...graph.typesByRecordTypeId.values()].map((type) => {
      const recordCount = [...graph.nodesById.values()].filter(
        (node) => node.kind === "record" && node.typeId === type.recordTypeId
      ).length;
      return { ...type, recordCount };
    });
  }, [graph]);

  const recordGroups = useMemo(() => {
    if (!graph) {
      return new Map<string, string[]>();
    }
    const groups = new Map<string, string[]>();
    for (const node of graph.nodesById.values()) {
      if (node.kind !== "record") {
        continue;
      }
      const group = groups.get(node.typeId) ?? [];
      group.push(node.id);
      groups.set(node.typeId, group);
    }
    for (const [typeId, ids] of groups.entries()) {
      ids.sort((a, b) => a.localeCompare(b));
      groups.set(typeId, ids);
    }
    return groups;
  }, [graph]);

  useEffect(() => {
    if (!graph) {
      setSelectedRecordId(null);
      return;
    }
    if (selectedRecordId && graph.nodesById.has(selectedRecordId)) {
      return;
    }
    const firstRecordId = [...recordGroups.values()][0]?.[0];
    setSelectedRecordId(firstRecordId ?? null);
  }, [graph, recordGroups, selectedRecordId]);

  const selectedRecord = selectedRecordId ? graph?.nodesById.get(selectedRecordId) ?? null : null;
  const outgoingLinks = selectedRecord ? graph?.getLinksFrom(selectedRecord.id) ?? [] : [];
  const incomingLinks = selectedRecord ? graph?.getLinksTo(selectedRecord.id) ?? [] : [];

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
        {activeDataset && graph ? (
          <div className="dataset-browse">
            <div className="dataset-summary">
              <p>
                <strong>{datasetNode?.fields?.name ? String(datasetNode.fields.name) : "Dataset"}</strong>
              </p>
              {datasetNode?.fields?.description ? (
                <p>{String(datasetNode.fields.description)}</p>
              ) : null}
              <p>ID: {datasetNode?.id ?? "Unknown"}</p>
              <p>Created: {datasetNode?.createdAt ?? "Unknown"}</p>
              <p>Updated: {datasetNode?.updatedAt ?? "Unknown"}</p>
              <p>Stored files: {activeDataset.repoSnapshot.files.size}</p>
              <Link to="/import">Import another dataset</Link>
            </div>

            <div className="dataset-types">
              <h2>Types</h2>
              <ul>
                {typeSummaries.map((type) => (
                  <li key={type.recordTypeId}>
                    <strong>{type.recordTypeId}</strong> — {type.recordCount} record
                    {type.recordCount === 1 ? "" : "s"}
                  </li>
                ))}
              </ul>
            </div>

            <div className="dataset-records">
              <h2>Records</h2>
              {[...recordGroups.entries()].map(([typeId, ids]) => (
                <div key={typeId} className="record-group">
                  <h3>{typeId}</h3>
                  <ul>
                    {ids.map((id) => (
                      <li key={id}>
                        <button
                          type="button"
                          className={id === selectedRecordId ? "record-link is-active" : "record-link"}
                          onClick={() => setSelectedRecordId(id)}
                        >
                          {id}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="record-details">
              <h2>Record details</h2>
              {selectedRecord ? (
                <div className="record-card">
                  <p>
                    <strong>{selectedRecord.id}</strong>
                  </p>
                  <p>Type: {selectedRecord.typeId}</p>
                  <p>Created: {selectedRecord.createdAt}</p>
                  <p>Updated: {selectedRecord.updatedAt}</p>
                  <div>
                    <h3>Fields</h3>
                    <pre>{JSON.stringify(selectedRecord.fields, null, 2)}</pre>
                  </div>
                  <div>
                    <h3>Body</h3>
                    <pre>{selectedRecord.body || "(no body)"}</pre>
                  </div>
                  <div className="record-links">
                    <div>
                      <h3>Outgoing links</h3>
                      <ul>
                        {outgoingLinks.length ? (
                          outgoingLinks.map((link) => <li key={link}>{link}</li>)
                        ) : (
                          <li>None</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h3>Incoming links</h3>
                      <ul>
                        {incomingLinks.length ? (
                          incomingLinks.map((link) => <li key={link}>{link}</li>)
                        ) : (
                          <li>None</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <p>Select a record to view details.</p>
              )}
            </div>
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
