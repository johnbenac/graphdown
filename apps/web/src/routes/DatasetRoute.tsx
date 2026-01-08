import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { RecordLinkGraphRecordNode } from "../graphdown";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";
import ImportWarningBanner from "../components/ImportWarningBanner";
import RecordEditor from "../components/RecordEditor";
import RecordViewer from "../components/RecordViewer";
import TypeViewer from "../components/TypeViewer";
import TypeNav, { getTypeLabel } from "../components/TypeNav";
import { useDataset } from "../state/DatasetContext";

export default function DatasetRoute() {
  const { activeDataset, status } = useDataset();
  const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"view" | "edit" | "create">("view");
  const [previousRecordKey, setPreviousRecordKey] = useState<string | null>(null);
  const { typeId } = useParams();
  const navigate = useNavigate();

  const recordLinkGraph = activeDataset?.recordLinkGraph;

  const sortedTypeIds = useMemo(() => {
    if (!recordLinkGraph) {
      return [];
    }
    return [...recordLinkGraph.typesById.keys()].sort((a, b) => a.localeCompare(b));
  }, [recordLinkGraph]);

  useEffect(() => {
    if (!recordLinkGraph || sortedTypeIds.length === 0) {
      return;
    }
    const isValidType = typeId && recordLinkGraph.typesById.has(typeId);
    if (!isValidType) {
      navigate(`/datasets/${sortedTypeIds[0]}`, { replace: true });
    }
  }, [recordLinkGraph, sortedTypeIds, typeId, navigate]);

  const selectedTypeId =
    typeId && recordLinkGraph?.typesById.has(typeId) ? typeId : null;
  const selectedTypeDef = selectedTypeId ? recordLinkGraph?.typesById.get(selectedTypeId) ?? null : null;

  const recordsForSelectedType = useMemo(() => {
    if (!recordLinkGraph || !selectedTypeId) {
      return [];
    }
    return [...recordLinkGraph.nodesByIdentity.values()]
      .filter(
        (node): node is RecordLinkGraphRecordNode =>
          node.kind === "record" && node.typeId === selectedTypeId
      )
      .sort((a, b) => a.recordId.localeCompare(b.recordId));
  }, [recordLinkGraph, selectedTypeId]);

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

  const selectedRecord = selectedRecordKey ? recordLinkGraph?.nodesByIdentity.get(selectedRecordKey) ?? null : null;
  const selectedRecordNode =
    selectedRecord && selectedRecord.kind === "record" ? selectedRecord : null;
  const outgoingLinks = selectedRecordNode
    ? recordLinkGraph?.getOutgoingRecordLinks(selectedRecordNode.recordKey) ?? []
    : [];
  const incomingLinks = selectedRecordNode
    ? recordLinkGraph?.getIncomingRecordLinks(selectedRecordNode.recordKey) ?? []
    : [];

  return (
    <AppShell
      sidebar={
        activeDataset ? (
          <div className="sidebar-stack">
            <div>
              <p>Active dataset:</p>
              <strong>{activeDataset.meta.label ?? activeDataset.meta.id}</strong>
            </div>
            {recordLinkGraph ? <TypeNav recordLinkGraph={recordLinkGraph} /> : null}
            <Link to="/import">Import another dataset</Link>
          </div>
        ) : (
          <p>No datasets loaded.</p>
        )
      }
    >
      <section data-testid="dataset-screen">
        <h1>{selectedTypeDef ? getTypeLabel(selectedTypeDef) : "Datasets"}</h1>
        {activeDataset && recordLinkGraph ? (
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
                <p>Stored files: {activeDataset.datasetSnapshot.files.size}</p>
                <ImportWarningBanner report={activeDataset.meta.importReport} />
              </div>
              {selectedTypeDef ? (
                <div className="type-details">
                  <div className="record-details__header">
                    <h2>Type details</h2>
                  </div>
                  <TypeViewer typeDef={selectedTypeDef} />
                </div>
              ) : null}

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
                {editorMode === "create" && selectedTypeDef && recordLinkGraph ? (
                  <RecordEditor
                    mode="create"
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
                ) : selectedRecordNode && selectedTypeDef && recordLinkGraph ? (
                  editorMode === "edit" ? (
                    <RecordEditor
                      mode="edit"
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
