import { useEffect, useMemo, useState } from "react";
import type { Graph, GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { ValidationError } from "../../../../src/core/errors";
import { isObject } from "../../../../src/core/types";
import { useDataset } from "../state/DatasetContext";
import { readRef, readRefs, writeRef, writeRefs, type FieldDef, type TypeSchema } from "../schema/typeSchema";

type RecordEditorProps = {
  mode: "edit" | "create";
  schema: TypeSchema | null;
  record?: GraphNode | null;
  typeDef: GraphTypeDef;
  graph: Graph;
  onCancel: () => void;
  onSaved: (id: string) => void;
};

type DraftFields = Record<string, string>;

function getInitialBody(record: GraphNode | null | undefined, bodyField?: string): string {
  if (!record) {
    return "";
  }
  if (record.body) {
    return record.body;
  }
  if (bodyField && isObject(record.fields) && typeof record.fields[bodyField] === "string") {
    return record.fields[bodyField] as string;
  }
  return "";
}

function getInitialFieldValue(record: GraphNode | null | undefined, field: FieldDef): string {
  if (!record || !isObject(record.fields)) {
    return "";
  }
  const value = record.fields[field.name];
  switch (field.kind) {
    case "number":
      if (typeof value === "number") {
        return String(value);
      }
      if (typeof value === "string") {
        return value;
      }
      return "";
    case "ref":
      return readRef(value);
    case "ref[]":
      return readRefs(value).join("\n");
    default:
      return typeof value === "string" ? value : "";
  }
}

function buildFieldPayload(
  fields: DraftFields,
  schema: TypeSchema,
  mode: "edit" | "create"
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of schema.fields) {
    if (field.name === schema.bodyField) {
      continue;
    }
    const raw = fields[field.name] ?? "";
    let nextValue: unknown = undefined;

    switch (field.kind) {
      case "number": {
        const trimmed = raw.trim();
        if (trimmed) {
          const parsed = Number(trimmed);
          nextValue = Number.isNaN(parsed) ? trimmed : parsed;
        }
        break;
      }
      case "enum":
      case "string":
      case "date": {
        const trimmed = raw.trim();
        if (trimmed) {
          nextValue = trimmed;
        }
        break;
      }
      case "ref": {
        nextValue = writeRef(raw);
        break;
      }
      case "ref[]": {
        const entries = raw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        nextValue = writeRefs(entries);
        break;
      }
    }

    if (mode === "create") {
      if (nextValue !== undefined) {
        payload[field.name] = nextValue;
      }
    } else {
      payload[field.name] = nextValue;
    }
  }

  if (mode === "edit" && schema.bodyField) {
    payload[schema.bodyField] = undefined;
  }

  return payload;
}

function formatError(error: ValidationError): string {
  if (error.path) {
    return `${error.path}: ${error.message}`;
  }
  return error.message;
}

export default function RecordEditor({
  mode,
  schema,
  record,
  typeDef,
  graph,
  onCancel,
  onSaved
}: RecordEditorProps) {
  const { updateRecord, createRecord } = useDataset();
  const [recordId, setRecordId] = useState(record?.id ?? "");
  const [draftBody, setDraftBody] = useState("");
  const [draftFields, setDraftFields] = useState<DraftFields>({});
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const schemaFields = schema?.fields ?? [];
  const bodyFieldName = schema?.bodyField;
  const bodyLabel =
    schemaFields.find((field) => field.name === bodyFieldName)?.label ?? bodyFieldName ?? "Body";

  useEffect(() => {
    setRecordId(record?.id ?? "");
    setDraftBody(getInitialBody(record, bodyFieldName));
    const nextFields: DraftFields = {};
    for (const field of schemaFields) {
      if (field.name === bodyFieldName) {
        continue;
      }
      nextFields[field.name] = getInitialFieldValue(record, field);
    }
    setDraftFields(nextFields);
    setErrors(null);
    setIsSaving(false);
  }, [record, schemaFields, bodyFieldName, mode]);

  const recordIdOptions = useMemo(
    () =>
      [...graph.nodesById.values()]
        .filter((node) => node.kind === "record")
        .map((node) => node.id)
        .sort((a, b) => a.localeCompare(b)),
    [graph]
  );

  if (!schema) {
    return <p>Schema definition is invalid.</p>;
  }

  const handleSave = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setErrors(null);

    const fieldsPayload = buildFieldPayload(draftFields, schema, mode);
    const bodyValue = draftBody ?? "";

    if (mode === "create") {
      const trimmedId = recordId.trim();
      if (!trimmedId) {
        setErrors([{ code: "E_USAGE", message: "Record ID is required." }]);
        setIsSaving(false);
        return;
      }
      const result = await createRecord({
        recordTypeId: typeDef.recordTypeId,
        id: trimmedId,
        fields: fieldsPayload,
        body: bodyValue
      });
      setIsSaving(false);
      if (result.ok) {
        onSaved(result.id);
        return;
      }
      setErrors(result.errors);
      return;
    }

    if (!record) {
      setIsSaving(false);
      return;
    }

    const result = await updateRecord({
      recordId: record.id,
      nextFields: fieldsPayload,
      nextBody: bodyValue
    });
    setIsSaving(false);
    if (result.ok) {
      onSaved(record.id);
      return;
    }
    setErrors(result.errors);
  };

  return (
    <div className="record-card">
      <h3>{mode === "create" ? "Create record" : `Edit ${record?.id}`}</h3>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        {mode === "create" ? (
          <div className="form-row">
            <label htmlFor="record-id">Record ID</label>
            <input
              id="record-id"
              data-testid="record-id"
              type="text"
              value={recordId}
              onChange={(event) => setRecordId(event.target.value)}
            />
          </div>
        ) : null}

        {schemaFields
          .filter((field) => field.name !== bodyFieldName)
          .map((field) => {
            const label = field.label ?? field.name;
            const requiredLabel = field.required ? " *" : "";
            const inputId = `field-${field.name}`;
            const value = draftFields[field.name] ?? "";

            if (field.kind === "enum") {
              return (
                <div key={field.name} className="form-row">
                  <label htmlFor={inputId}>
                    {label}
                    {requiredLabel}
                  </label>
                  <select
                    id={inputId}
                    value={value}
                    onChange={(event) =>
                      setDraftFields((prev) => ({ ...prev, [field.name]: event.target.value }))
                    }
                  >
                    <option value="">Select...</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.kind === "ref[]") {
              return (
                <div key={field.name} className="form-row">
                  <label htmlFor={inputId}>
                    {label}
                    {requiredLabel}
                  </label>
                  <textarea
                    id={inputId}
                    rows={4}
                    value={value}
                    onChange={(event) =>
                      setDraftFields((prev) => ({ ...prev, [field.name]: event.target.value }))
                    }
                    placeholder="One id per line"
                  />
                </div>
              );
            }

            return (
              <div key={field.name} className="form-row">
                <label htmlFor={inputId}>
                  {label}
                  {requiredLabel}
                </label>
                <input
                  id={inputId}
                  type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
                  value={value}
                  onChange={(event) =>
                    setDraftFields((prev) => ({ ...prev, [field.name]: event.target.value }))
                  }
                  list={field.kind === "ref" ? "record-id-options" : undefined}
                />
              </div>
            );
          })}

        <div className="form-row">
          <label htmlFor="body-field">{bodyLabel}</label>
          <textarea
            id="body-field"
            rows={6}
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
          />
        </div>

        {errors && errors.length ? (
          <div className="form-error">
            <strong>Unable to save record</strong>
            <ul>
              {errors.map((error, index) => (
                <li key={`${error.code}-${index}`}>{formatError(error)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="form-actions">
          <button
            type="submit"
            className="button"
            data-testid="save-record"
            disabled={isSaving || (mode === "create" && !recordId.trim())}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="button secondary"
            data-testid="cancel-edit"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
      <datalist id="record-id-options">
        {recordIdOptions.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>
    </div>
  );
}
