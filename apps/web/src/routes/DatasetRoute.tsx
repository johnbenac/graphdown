import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import TypeNav, { getTypeLabel } from "../components/TypeNav";
import { useDataset } from "../state/DatasetContext";

export default function DatasetRoute() {
  const { activeDataset, status } = useDataset();
  const { recordTypeId } = useParams();
  const navigate = useNavigate();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

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
  }, [graph, navigate, recordTypeId, sortedTypeIds]);

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
    setSelectedRecordId(recordsForSelectedType[0].id);
  }, [recordsForSelectedType, selectedRecordId, selectedTypeId]);

  const selectedRecord = selectedRecordId ? graph?.nodesById.get(selectedRecordId) ?? null : null;
  const outgoingLinks = selectedRecord ? graph?.getLinksFrom(selectedRecord.id) ?? [] : [];
  const incomingLinks = selectedRecord ? graph?.getLinksTo(selectedRecord.id) ?? [] : [];

  const sidebarContent = activeDataset ? (
    <div className="sidebar-stack">
      <div>
        <p>Active dataset:</p>
        <strong>{activeDataset.meta.label ?? activeDataset.meta.id}</strong>
      </div>
      {graph ? <TypeNav graph={graph} /> : null}
      <Link to="/import">Import another dataset</Link>
    </div>
  ) : (
    <p>No datasets loaded.</p>
  );

  return (
    <AppShell sidebar={sidebarContent}>
      <section data-testid="dataset-screen">
        {activeDataset && graph ? (
          sortedTypeIds.length ? (
            selectedTypeDef ? (
              <div className="dataset-browse">
                <header>
                  <h1>{getTypeLabel(selectedTypeDef)}</h1>
                  <p>Record type: {selectedTypeDef.recordTypeId}</p>
                </header>

                <div className="dataset-records" data-testid="record-list">
                  <h2>Records</h2>
                  {recordsForSelectedType.length ? (
                    <ul className="record-list">
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
                    <EmptyState title="No records for this type yet">
                      <p>Create a new record to see it listed here.</p>
                    </EmptyState>
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
            ) : (
              <EmptyState title="Loading type...">
                <p>Preparing the selected type view.</p>
              </EmptyState>
            )
          ) : (
            <EmptyState title="No types defined in this dataset">
              <p>Add type records in the dataset types folder to get started.</p>
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
