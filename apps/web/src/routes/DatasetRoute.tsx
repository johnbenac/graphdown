import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { GraphRecordNode } from "../../../../src/core/graph";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import RecordEditor from "../components/RecordEditor";
import RecordViewer from "../components/RecordViewer";
import TypeNav, { getTypeLabel } from "../components/TypeNav";
import { parseTypeSchema } from "../schema/typeSchema";
import { useDataset } from "../state/DatasetContext";

export default function DatasetRoute() {
  const { activeDataset, status } = useDataset();
  const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"view" | "edit" | "create">("view");
  const [previousRecordKey, setPreviousRecordKey] = useState<string | null>(null);
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
    if (!graph || sortedTypeIds.length === 0) {
      return;
    }
    const isValidType = recordTypeId && graph.typesByRecordTypeId.has(recordTypeId);
    if (!isValidType) {
      navigate(`/datasets/${sortedTypeIds[0]}`, { replace: true });
    }
  }, [graph, sortedTypeIds, recordTypeId, navigate]);

  const selectedTypeId =
    recordTypeId && graph?.typesByRecordTypeId.has(recordTypeId) ? recordTypeId : null;
  const selectedTypeDef = selectedTypeId ? graph?.typesByRecordTypeId.get(selectedTypeId) ?? null : null;
  const schemaResult = selectedTypeDef ? parseTypeSchema(selectedTypeDef.fields) : null;
  const schema = schemaResult && schemaResult.ok ? schemaResult.schema : undefined;
  const schemaError = schemaResult && !schemaResult.ok ? schemaResult.message : undefined;

  const recordsForSelectedType = useMemo(() => {
    if (!graph || !selectedTypeId) {
      return [];
    }
    return [...graph.nodesById.values()]
      .filter((node): node is GraphRecordNode => node.kind === "record" && node.typeId === selectedTypeId)
      .sort((a, b) => a.recordId.localeCompare(b.recordId));
  }, [graph, selectedTypeId]);

  useEffect(() => {
    if (!selectedTypeId) {
      setSelectedRecordKey(null);
      setEditorMode("view");
      return;
    }
    if (editorMode === "create") {
      return;
    }
    if (selectedRecordKey && recordsForSelectedType.some((record) => record.recordKey === selectedRecordKey)) {
      return;
    }
    const firstRecordKey = recordsForSelectedType[0]?.recordKey ?? null;
    setSelectedRecordKey(firstRecordKey);
  }, [recordsForSelectedType, selectedRecordKey, selectedTypeId, editorMode]);

  useEffect(() => {
    setEditorMode("view");
    setPreviousRecordKey(null);
  }, [selectedTypeId]);

  const selectedRecord = selectedRecordKey ? graph?.nodesById.get(selectedRecordKey) ?? null : null;
  const selectedRecordNode =
    selectedRecord && selectedRecord.kind === "record" ? selectedRecord : null;
  const outgoingLinks = selectedRecordNode ? graph?.getLinksFrom(selectedRecordNode.recordKey) ?? [] : [];
  const incomingLinks = selectedRecordNode ? graph?.getLinksTo(selectedRecordNode.recordKey) ?? [] : [];

  return (
    <AppShell
      sidebar={
        activeDataset ? (
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
        )
      }
    >
      <section data-testid="dataset-screen">
        <h1>{selectedTypeDef ? getTypeLabel(selectedTypeDef) : "Datasets"}</h1>
        {activeDataset && graph ? (
          sortedTypeIds.length ? (
            <div className="dataset-browse">
              <div className="dataset-summary">
                <p>
                  <strong>
                    {activeDataset.meta.label ?? activeDataset.meta.id}
                  </strong>
                </p>
                <p>ID: {activeDataset.meta.id}</p>
                <p>Created: {new Date(activeDataset.meta.createdAt).toISOString()}</p>
                <p>Updated: {new Date(activeDataset.meta.updatedAt).toISOString()}</p>
                <p>Stored files: {activeDataset.repoSnapshot.files.size}</p>
              </div>

              <div className="dataset-records" data-testid="record-list">
                <div className="record-list__header">
                  <h2>Records</h2>
                  <button
                    type="button"
                    className="button secondary"
                    data-testid="create-record"
                    disabled={!selectedTypeDef}
                    onClick={() => {
                      setPreviousRecordKey(selectedRecordKey);
                      setSelectedRecordKey(null);
                      setEditorMode("create");
                    }}
                  >
                    New record
                  </button>
                </div>
                {recordsForSelectedType.length ? (
                  <ul>
                    {recordsForSelectedType.map((record) => (
                      <li key={record.recordKey}>
                        <button
                          type="button"
                          className={
                            record.recordKey === selectedRecordKey ? "record-link is-active" : "record-link"
                          }
                          onClick={() => {
                            setSelectedRecordKey(record.recordKey);
                            setEditorMode("view");
                          }}
                        >
                          {record.recordId}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No records for this type yet" />
                )}
              </div>

              <div className="record-details" data-testid="record-details">
                <div className="record-details__header">
                  <h2>Record details</h2>
                  {selectedRecordNode && editorMode === "view" ? (
                    <button
                      type="button"
                      className="button secondary"
                      data-testid="edit-record"
                      onClick={() => setEditorMode("edit")}
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                {editorMode === "create" && selectedTypeDef && graph ? (
                  <RecordEditor
                    mode="create"
                    schema={schema}
                    schemaError={schemaError}
                    typeDef={selectedTypeDef}
                    onCancel={() => {
                      setEditorMode("view");
                      setSelectedRecordKey(previousRecordKey);
                    }}
                    onComplete={(newId) => {
                      setEditorMode("view");
                      setSelectedRecordKey(newId);
                    }}
                  />
                ) : selectedRecordNode && selectedTypeDef && graph ? (
                  editorMode === "edit" ? (
                    <RecordEditor
                      mode="edit"
                      schema={schema}
                      schemaError={schemaError}
                      record={selectedRecordNode}
                      typeDef={selectedTypeDef}
                      onCancel={() => setEditorMode("view")}
                      onComplete={(id) => {
                        setEditorMode("view");
                        setSelectedRecordKey(id);
                      }}
                    />
                  ) : (
                    <RecordViewer
                      record={selectedRecordNode}
                      typeDef={selectedTypeDef}
                      outgoingLinks={outgoingLinks}
                      incomingLinks={incomingLinks}
                    />
                  )
                ) : (
                  <p>Select a record to view details.</p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="No types defined in this dataset" />
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
