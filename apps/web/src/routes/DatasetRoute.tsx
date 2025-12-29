import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import TypeNav from "../components/TypeNav";
import { useDataset } from "../state/DatasetContext";
import { getTypeLabel } from "../utils/typeLabels";

export default function DatasetRoute() {
  const { activeDataset, status } = useDataset();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const { recordTypeId } = useParams();
  const navigate = useNavigate();

  const graph = activeDataset?.parsedGraph;

  const sortedTypeIds = useMemo(() => {
    if (!graph) {
      return [];
    }
    return [...graph.typesByRecordTypeId.keys()].sort((a, b) => a.localeCompare(b));
  }, [graph]);

  useEffect(() => {
    if (!graph) {
      return;
    }
    if (!sortedTypeIds.length) {
      return;
    }
    const isValid = recordTypeId && graph.typesByRecordTypeId.has(recordTypeId);
    if (!isValid) {
      navigate(`/datasets/${sortedTypeIds[0]}`, { replace: true });
    }
  }, [graph, sortedTypeIds, recordTypeId, navigate]);

  const selectedTypeId =
    recordTypeId && graph?.typesByRecordTypeId.has(recordTypeId) ? recordTypeId : null;
  const selectedTypeDef = selectedTypeId ? graph?.typesByRecordTypeId.get(selectedTypeId) : null;

  const recordsForSelectedType = useMemo(() => {
    if (!graph || !selectedTypeId) {
      return [];
    }
    return [...graph.nodesById.values()]
      .filter((node) => node.kind === "record" && node.typeId === selectedTypeId)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [graph, selectedTypeId]);

  useEffect(() => {
    if (!selectedTypeId) {
      setSelectedRecordId(null);
      return;
    }
    if (!recordsForSelectedType.length) {
      setSelectedRecordId(null);
      return;
    }
    if (selectedRecordId && recordsForSelectedType.some((record) => record.id === selectedRecordId)) {
      return;
    }
    setSelectedRecordId(recordsForSelectedType[0]?.id ?? null);
  }, [selectedTypeId, recordsForSelectedType, selectedRecordId]);

  const selectedRecord = selectedRecordId ? graph?.nodesById.get(selectedRecordId) ?? null : null;
  const outgoingLinks = selectedRecord ? graph?.getLinksFrom(selectedRecord.id) ?? [] : [];
  const incomingLinks = selectedRecord ? graph?.getLinksTo(selectedRecord.id) ?? [] : [];
  const datasetLabel = activeDataset ? activeDataset.meta.label ?? activeDataset.meta.id : "";
  const selectedTypeLabel = selectedTypeDef ? getTypeLabel(selectedTypeDef) : "Records";

  return (
    <AppShell
      sidebar={
        activeDataset ? (
          <div className="dataset-sidebar">
            <div className="dataset-sidebar__header">
              <p>Active dataset:</p>
              <strong>{datasetLabel}</strong>
            </div>
            {graph && graph.typesByRecordTypeId.size ? (
              <TypeNav graph={graph} />
            ) : (
              <p>No types defined.</p>
            )}
            <Link to="/import">Import another dataset</Link>
          </div>
        ) : (
          <p>No datasets loaded.</p>
        )
      }
    >
      <section data-testid="dataset-screen">
        {activeDataset && graph ? (
          sortedTypeIds.length ? (
            <div className="dataset-view">
              <header className="dataset-header">
                <p className="dataset-header__eyebrow">{datasetLabel}</p>
                <h1>{selectedTypeLabel}</h1>
              </header>
              <div className="dataset-browse">
                <div className="dataset-records" data-testid="record-list">
                  <h2>Records</h2>
                  {recordsForSelectedType.length ? (
                    <ul>
                      {recordsForSelectedType.map((record) => (
                        <li key={record.id}>
                          <button
                            type="button"
                            className={
                              record.id === selectedRecordId
                                ? "record-link is-active"
                                : "record-link"
                            }
                            onClick={() => setSelectedRecordId(record.id)}
                          >
                            {record.id}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState title="No records for this type yet" />
                  )}
                </div>

                <div className="record-details" data-testid="record-details">
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
            </div>
          ) : (
            <EmptyState title="No types defined in this dataset">
              <Link to="/import">Import another dataset</Link>
            </EmptyState>
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
