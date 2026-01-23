import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { RuntimeRecordViewV1, RuntimeTypeViewV1 } from "@graphmd/runtime";
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
  const [typeIds, setTypeIds] = useState<string[]>([]);
  const [typesById, setTypesById] = useState<Map<string, RuntimeTypeViewV1>>(new Map());
  const [typeCounts, setTypeCounts] = useState<Map<string, number>>(new Map());
  const [typesLoading, setTypesLoading] = useState(false);
  const [recordsForSelectedType, setRecordsForSelectedType] = useState<RuntimeRecordViewV1[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [outgoingLinks, setOutgoingLinks] = useState<string[]>([]);
  const [incomingLinks, setIncomingLinks] = useState<string[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const { typeId } = useParams();
  const navigate = useNavigate();

  const runtimeApiV1 = activeDataset?.runtimeApiV1;

  useEffect(() => {
    if (!runtimeApiV1) {
      setTypeIds([]);
      setTypesById(new Map());
      setTypeCounts(new Map());
      return;
    }
    let cancelled = false;
    setTypesLoading(true);
    (async () => {
      const types = await runtimeApiV1.listTypes();
      types.sort((a, b) => a.typeId.localeCompare(b.typeId));
      const nextTypesById = new Map(types.map((type) => [type.typeId, type]));
      const counts = new Map<string, number>();
      await Promise.all(
        types.map(async (type) => {
          const keys = await runtimeApiV1.listRecordKeysByType(type.typeId);
          counts.set(type.typeId, keys.length);
        })
      );
      if (cancelled) {
        return;
      }
      setTypesById(nextTypesById);
      setTypeIds(types.map((type) => type.typeId));
      setTypeCounts(counts);
      setTypesLoading(false);
    })().catch((err) => {
      console.error("Failed to load types from runtime API.", err);
      if (!cancelled) {
        setTypesById(new Map());
        setTypeIds([]);
        setTypeCounts(new Map());
        setTypesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [runtimeApiV1]);

  useEffect(() => {
    if (!runtimeApiV1 || typeIds.length === 0) {
      return;
    }
    const isValidType = typeId && typesById.has(typeId);
    if (!isValidType) {
      navigate(`/datasets/${typeIds[0]}`, { replace: true });
    }
  }, [runtimeApiV1, typeIds, typeId, typesById, navigate]);

  const selectedTypeId = typeId && typesById.has(typeId) ? typeId : null;
  const selectedTypeDef = selectedTypeId ? typesById.get(selectedTypeId) ?? null : null;

  useEffect(() => {
    if (!runtimeApiV1 || !selectedTypeId) {
      setRecordsForSelectedType([]);
      return;
    }
    let cancelled = false;
    setRecordsLoading(true);
    runtimeApiV1
      .listRecordsByType(selectedTypeId)
      .then((records) => {
        if (cancelled) {
          return;
        }
        const sorted = [...records].sort((a, b) => a.recordId.localeCompare(b.recordId));
        setRecordsForSelectedType(sorted);
        setRecordsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load records from runtime API.", err);
        if (!cancelled) {
          setRecordsForSelectedType([]);
          setRecordsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runtimeApiV1, selectedTypeId]);

  const recordsByKey = useMemo(() => {
    return new Map(recordsForSelectedType.map((record) => [record.recordKey, record]));
  }, [recordsForSelectedType]);

  useEffect(() => {
    if (!selectedTypeId) {
      setSelectedRecordKey(null);
      setEditorMode("view");
      return;
    }
    if (editorMode === "create") {
      return;
    }
    if (selectedRecordKey && recordsByKey.has(selectedRecordKey)) {
      return;
    }
    const firstRecordKey = recordsForSelectedType[0]?.recordKey ?? null;
    setSelectedRecordKey(firstRecordKey);
  }, [recordsForSelectedType, recordsByKey, selectedRecordKey, selectedTypeId, editorMode]);

  useEffect(() => {
    setEditorMode("view");
    setPreviousRecordKey(null);
  }, [selectedTypeId]);

  const selectedRecord = selectedRecordKey ? recordsByKey.get(selectedRecordKey) ?? null : null;

  useEffect(() => {
    if (!runtimeApiV1 || !selectedRecordKey) {
      setOutgoingLinks([]);
      setIncomingLinks([]);
      return;
    }
    let cancelled = false;
    setLinksLoading(true);
    Promise.all([
      runtimeApiV1.getOutgoingRecordLinks(selectedRecordKey),
      runtimeApiV1.getIncomingRecordLinks(selectedRecordKey)
    ])
      .then(([outgoing, incoming]) => {
        if (cancelled) {
          return;
        }
        setOutgoingLinks(outgoing);
        setIncomingLinks(incoming);
        setLinksLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load record links from runtime API.", err);
        if (!cancelled) {
          setOutgoingLinks([]);
          setIncomingLinks([]);
          setLinksLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runtimeApiV1, selectedRecordKey]);

  const sortedTypes = useMemo(() => {
    return typeIds.map((id) => typesById.get(id)).filter(Boolean) as RuntimeTypeViewV1[];
  }, [typeIds, typesById]);

  const totalRecordCount = useMemo(() => {
    let total = 0;
    for (const count of typeCounts.values()) {
      total += count;
    }
    return total;
  }, [typeCounts]);

  const recordNotFound = Boolean(selectedRecordKey && !selectedRecord && !recordsLoading);

  return (
    <AppShell
      sidebar={
        activeDataset ? (
          <div className="sidebar-stack">
            <div>
              <p>Active dataset:</p>
              <strong>{activeDataset.meta.label ?? activeDataset.meta.id}</strong>
            </div>
            {sortedTypes.length ? (
              <TypeNav types={sortedTypes} recordCounts={typeCounts} />
            ) : typesLoading ? (
              <p>Loading types...</p>
            ) : null}
            <Link to="/import">Import another dataset</Link>
          </div>
        ) : (
          <p>No datasets loaded.</p>
        )
      }
    >
      <section data-testid="dataset-screen">
        <h1>{selectedTypeDef ? getTypeLabel(selectedTypeDef) : "Datasets"}</h1>
        {activeDataset ? (
          sortedTypes.length ? (
            <div className="dataset-browse">
              <div className="dataset-summary">
                <p>
                  <strong>{activeDataset.meta.label ?? activeDataset.meta.id}</strong>
                </p>
                <p>ID: {activeDataset.meta.id}</p>
                <p>Created: {new Date(activeDataset.meta.createdAt).toISOString()}</p>
                <p>Updated: {new Date(activeDataset.meta.updatedAt).toISOString()}</p>
                <p>Types: {sortedTypes.length}</p>
                <p>Records: {totalRecordCount}</p>
                <ImportWarningBanner report={activeDataset.meta.importReport} />
              </div>
              {selectedTypeDef ? (
                <div className="type-details">
                  <div className="record-details__header">
                    <h2>Type details</h2>
                  </div>
                  <TypeViewer typeDef={selectedTypeDef} />
                </div>
              ) : typesLoading ? (
                <p>Loading types...</p>
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
                {recordsLoading ? (
                  <p>Loading records...</p>
                ) : recordsForSelectedType.length ? (
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
                ) : recordNotFound ? (
                  <p>Record not found.</p>
                ) : linksLoading ? (
                  <p>Loading record details...</p>
                ) : (
                  <p>Select a record to view details.</p>
                )}
              </div>
            </div>
          ) : typesLoading ? (
            <p>Loading types...</p>
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
