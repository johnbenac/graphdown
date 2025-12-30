import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import RecordEditor from "../components/RecordEditor";
import RecordViewer from "../components/RecordViewer";
import TypeNav, { getTypeLabel } from "../components/TypeNav";
import { parseTypeSchema } from "../schema/typeSchema";
import { useDataset } from "../state/DatasetContext";

export default function DatasetRoute() {
  const { activeDataset, status } = useDataset();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"view" | "edit" | "create">("view");
  const [previousRecordId, setPreviousRecordId] = useState<string | null>(null);
  const { recordTypeId } = useParams();
  const navigate = useNavigate();

  const graph = activeDataset?.parsedGraph;

  const datasetNode = useMemo(() => {
    if (!graph) {
      return undefined;
    }
    return [...graph.nodesById.values()].find((node) => node.kind === "dataset");
  }, [graph]);

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
    if (selectedRecordId && recordsForSelectedType.some((record) => record.id === selectedRecordId)) {
      return;
    }
    const firstRecordId = recordsForSelectedType[0]?.id ?? null;
    setSelectedRecordId(firstRecordId);
  }, [recordsForSelectedType, selectedRecordId, selectedTypeId]);

  useEffect(() => {
    if (editorMode === "create") {
      return;
    }
    if (editorMode !== "view") {
      setEditorMode("view");
    }
  }, [selectedRecordId, selectedTypeId, editorMode]);

  const selectedRecord = selectedRecordId ? graph?.nodesById.get(selectedRecordId) ?? null : null;
  const outgoingLinks = selectedRecord ? graph?.getLinksFrom(selectedRecord.id) ?? [] : [];
  const incomingLinks = selectedRecord ? graph?.getLinksTo(selectedRecord.id) ?? [] : [];
  const schemaResult = useMemo(() => parseTypeSchema(selectedTypeDef), [selectedTypeDef]);
  const schema = schemaResult.ok ? schemaResult.schema : null;

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
                    {datasetNode?.fields?.name ? String(datasetNode.fields.name) : "Dataset"}
                  </strong>
                </p>
                {datasetNode?.fields?.description ? (
                  <p>{String(datasetNode.fields.description)}</p>
                ) : null}
                <p>ID: {datasetNode?.id ?? "Unknown"}</p>
                <p>Created: {datasetNode?.createdAt ?? "Unknown"}</p>
                <p>Updated: {datasetNode?.updatedAt ?? "Unknown"}</p>
                <p>Stored files: {activeDataset.repoSnapshot.files.size}</p>
              </div>

              <div className="dataset-records" data-testid="record-list">
                <div className="record-list-header">
                  <h2>Records</h2>
                  <button
                    type="button"
                    className="button secondary"
                    data-testid="create-record"
                    onClick={() => {
                      setPreviousRecordId(selectedRecordId);
                      setSelectedRecordId(null);
                      setEditorMode("create");
                    }}
                  >
                    New record
                  </button>
                </div>
                {recordsForSelectedType.length ? (
                  <ul>
                    {recordsForSelectedType.map((record) => (
                      <li key={record.id}>
                        <button
                          type="button"
                          className={
                            record.id === selectedRecordId ? "record-link is-active" : "record-link"
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
                {editorMode === "create" && selectedTypeDef ? (
                  <RecordEditor
                    mode="create"
                    schema={schema}
                    record={null}
                    typeDef={selectedTypeDef}
                    graph={graph}
                    onCancel={() => {
                      setEditorMode("view");
                      setSelectedRecordId(previousRecordId);
                    }}
                    onSaved={(id) => {
                      setEditorMode("view");
                      setSelectedRecordId(id);
                    }}
                  />
                ) : null}
                {editorMode === "edit" && selectedRecord && selectedTypeDef ? (
                  <RecordEditor
                    mode="edit"
                    schema={schema}
                    record={selectedRecord}
                    typeDef={selectedTypeDef}
                    graph={graph}
                    onCancel={() => setEditorMode("view")}
                    onSaved={(id) => {
                      setEditorMode("view");
                      setSelectedRecordId(id);
                    }}
                  />
                ) : null}
                {editorMode === "view" && selectedRecord && selectedTypeDef ? (
                  <RecordViewer
                    record={selectedRecord}
                    typeDef={selectedTypeDef}
                    schema={schema}
                    outgoingLinks={outgoingLinks}
                    incomingLinks={incomingLinks}
                    onEdit={() => setEditorMode("edit")}
                  />
                ) : null}
                {editorMode === "view" && !selectedRecord ? (
                  <p>Select a record to view details.</p>
                ) : null}
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
