import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { RuntimeRecordViewV1, RuntimeTypeViewV1 } from "@graphdown/runtime";
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
  const runtimeApiV1 = activeDataset?.runtimeApiV1 ?? null;
  const [selectedRecordKey, setSelectedRecordKey] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"view" | "edit" | "create">("view");
  const [previousRecordKey, setPreviousRecordKey] = useState<string | null>(null);
  const { typeId } = useParams();
  const navigate = useNavigate();
  const [typeViews, setTypeViews] = useState<RuntimeTypeViewV1[] | null>(null);
  const [typeCounts, setTypeCounts] = useState<Map<string, number> | null>(null);
  const [recordsForSelectedType, setRecordsForSelectedType] = useState<RuntimeRecordViewV1[] | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RuntimeRecordViewV1 | null>(null);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [outgoingLinks, setOutgoingLinks] = useState<string[]>([]);
  const [incomingLinks, setIncomingLinks] = useState<string[]>([]);
  const [areLinksLoading, setAreLinksLoading] = useState(false);

  useEffect(() => {
    if (!runtimeApiV1) {
      setTypeViews(null);
      return;
    }
    let isActive = true;
    setTypeViews(null);
    runtimeApiV1
      .listTypes()
      .then((types) => {
        if (!isActive) {
          return;
        }
        const sorted = [...types].sort((a, b) => a.typeId.localeCompare(b.typeId));
        setTypeViews(sorted);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        setTypeViews([]);
      });
    return () => {
      isActive = false;
    };
  }, [runtimeApiV1]);

  useEffect(() => {
    if (!runtimeApiV1 || !typeViews) {
      setTypeCounts(null);
      return;
    }
    if (typeViews.length === 0) {
      setTypeCounts(new Map());
      return;
    }
    let isActive = true;
    Promise.all(
      typeViews.map(async (type) => {
        const keys = await runtimeApiV1.listRecordKeysByType(type.typeId);
        return [type.typeId, keys.length] as const;
      })
    )
      .then((entries) => {
        if (isActive) {
          setTypeCounts(new Map(entries));
        }
      })
      .catch(() => {
        if (isActive) {
          setTypeCounts(new Map());
        }
      });
    return () => {
      isActive = false;
    };
  }, [runtimeApiV1, typeViews]);

  useEffect(() => {
    if (!typeViews || typeViews.length === 0) {
      return;
    }
    const isValidType = typeId && typeViews.some((type) => type.typeId === typeId);
    if (!isValidType) {
      navigate(`/datasets/${typeViews[0].typeId}`, { replace: true });
    }
  }, [typeViews, typeId, navigate]);

  const selectedTypeId = typeId && typeViews?.some((type) => type.typeId === typeId) ? typeId : null;
  const selectedTypeDef = selectedTypeId
    ? typeViews?.find((type) => type.typeId === selectedTypeId) ?? null
    : null;

  useEffect(() => {
    if (!runtimeApiV1 || !selectedTypeId) {
      setRecordsForSelectedType(selectedTypeId ? null : []);
      return;
    }
    let isActive = true;
    setRecordsForSelectedType(null);
    runtimeApiV1
      .listRecordsByType(selectedTypeId)
      .then((records) => {
        if (!isActive) {
          return;
        }
        const sorted = [...records].sort((a, b) => a.recordId.localeCompare(b.recordId));
        setRecordsForSelectedType(sorted);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        setRecordsForSelectedType([]);
      });
    return () => {
      isActive = false;
    };
  }, [runtimeApiV1, selectedTypeId]);

  useEffect(() => {
    if (!selectedTypeId) {
      setSelectedRecordKey(null);
      setEditorMode("view");
      return;
    }
    if (editorMode === "create") {
      return;
    }
    if (!recordsForSelectedType) {
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

  useEffect(() => {
    if (!runtimeApiV1 || !selectedRecordKey) {
      setSelectedRecord(null);
      setIsRecordLoading(false);
      return;
    }
    let isActive = true;
    setIsRecordLoading(true);
    runtimeApiV1
      .getRecord(selectedRecordKey)
      .then((record) => {
        if (!isActive) {
          return;
        }
        setSelectedRecord(record);
        setIsRecordLoading(false);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        setSelectedRecord(null);
        setIsRecordLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [runtimeApiV1, selectedRecordKey]);

  useEffect(() => {
    if (!runtimeApiV1 || !selectedRecordKey) {
      setOutgoingLinks([]);
      setIncomingLinks([]);
      setAreLinksLoading(false);
      return;
    }
    let isActive = true;
    setAreLinksLoading(true);
    Promise.all([
      runtimeApiV1.getOutgoingRecordLinks(selectedRecordKey),
      runtimeApiV1.getIncomingRecordLinks(selectedRecordKey)
    ])
      .then(([outgoing, incoming]) => {
        if (!isActive) {
          return;
        }
        setOutgoingLinks(outgoing);
        setIncomingLinks(incoming);
        setAreLinksLoading(false);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        setOutgoingLinks([]);
        setIncomingLinks([]);
        setAreLinksLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [runtimeApiV1, selectedRecordKey]);

  return (
    <AppShell
      sidebar={
        activeDataset ? (
          <div className="sidebar-stack">
            <div>
              <p>Active dataset:</p>
              <strong>{activeDataset.meta.label ?? activeDataset.meta.id}</strong>
            </div>
            {typeViews ? <TypeNav types={typeViews} counts={typeCounts ?? undefined} /> : <p>Loading types...</p>}
            <Link to="/import">Import another dataset</Link>
          </div>
        ) : (
          <p>No datasets loaded.</p>
        )
      }
    >
      <section data-testid="dataset-screen">
        <h1>
          {selectedTypeDef
            ? getTypeLabel(selectedTypeDef)
            : typeViews
              ? "Datasets"
              : "Loading dataset..."}
        </h1>
        {activeDataset && runtimeApiV1 ? (
          typeViews ? (
            typeViews.length ? (
              <div className="dataset-browse">
                <div className="dataset-summary">
                  <p>
                    <strong>{activeDataset.meta.label ?? activeDataset.meta.id}</strong>
                  </p>
                  <p>ID: {activeDataset.meta.id}</p>
                  <p>Created: {new Date(activeDataset.meta.createdAt).toISOString()}</p>
                  <p>Updated: {new Date(activeDataset.meta.updatedAt).toISOString()}</p>
                  <ImportWarningBanner report={activeDataset.meta.importReport} />
                </div>
                {selectedTypeDef ? (
                  <div className="type-details">
                    <div className="record-details__header">
                      <h2>Type details</h2>
                    </div>
                    <TypeViewer typeDef={selectedTypeDef} />
                  </div>
                ) : selectedTypeId ? (
                  <EmptyState title="Type not found" />
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
                  {recordsForSelectedType ? (
                    recordsForSelectedType.length ? (
                      <ul>
                        {recordsForSelectedType.map((record) => (
                          <li key={record.recordKey}>
                            <button
                              type="button"
                              className={
                                record.recordKey === selectedRecordKey
                                  ? "record-link is-active"
                                  : "record-link"
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
                    )
                  ) : (
                    <p>Loading records...</p>
                  )}
                </div>

                <div className="record-details" data-testid="record-details">
                  <div className="record-details__header">
                    <h2>Record details</h2>
                    {selectedRecord && editorMode === "view" ? (
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
                  {editorMode === "create" && selectedTypeDef ? (
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
                  ) : isRecordLoading ? (
                    <p>Loading record...</p>
                  ) : selectedRecord && selectedTypeDef ? (
                    editorMode === "edit" ? (
                      <RecordEditor
                        mode="edit"
                        record={selectedRecord}
                        typeDef={selectedTypeDef}
                        onCancel={() => setEditorMode("view")}
                        onComplete={(id) => {
                          setEditorMode("view");
                          setSelectedRecordKey(id);
                        }}
                      />
                    ) : (
                      <RecordViewer
                        record={selectedRecord}
                        typeDef={selectedTypeDef}
                        outgoingLinks={outgoingLinks}
                        incomingLinks={incomingLinks}
                      />
                    )
                  ) : selectedRecordKey ? (
                    <p>Record not found.</p>
                  ) : (
                    <p>Select a record to view details.</p>
                  )}
                  {areLinksLoading ? <p>Loading links...</p> : null}
                </div>
              </div>
            ) : (
              <EmptyState title="No types defined in this dataset" />
            )
          ) : (
            <EmptyState title="Loading dataset..." />
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
