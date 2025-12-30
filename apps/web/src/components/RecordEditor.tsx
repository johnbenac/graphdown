import { useEffect, useMemo, useState } from "react";
import type { Graph, GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { ValidationError } from "../../../../src/core/errors";
import { useDataset } from "../state/DatasetContext";
import type { FieldDef, TypeSchema } from "../schema/typeSchema";
import { readRef, readRefs, writeRef, writeRefs } from "../schema/typeSchema";

type RecordEditorProps = {
  mode: "edit" | "create";
  record?: GraphNode | null;
  typeDef: GraphTypeDef;
  schema: TypeSchema;
  graph: Graph;
  onCancel: () => void;
  onSaved: (id: string) => void;
};

function fieldLabel(field: FieldDef) {
  return field.label ?? field.name;
}

function buildInitialValue(field: FieldDef, record?: GraphNode | null): string {
  if (!record) {
    return "";
  }
  const raw = record.fields[field.name];
  switch (field.kind) {
    case "number":
      return typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw : "";
    case "enum":
    case "string":
    case "date":
      return typeof raw === "string" ? raw : "";
    case "ref":
      return readRef(raw);
    case "ref[]":
      return readRefs(raw).join("\n");
    default:
      return "";
  }
}

function fieldToValue(field: FieldDef, value: string): unknown {
  const trimmed = value.trim();
  switch (field.kind) {
    case "number": {
      if (!trimmed) {
        return undefined;
      }
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    case "enum":
    case "string":
    case "date":
      return trimmed ? trimmed : undefined;
    case "ref":
      return writeRef(trimmed);
    case "ref[]": {
      const refs = value
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean);
      return writeRefs(refs);
    }
    default:
      return undefined;
  }
}

export default function RecordEditor({
  mode,
  record,
  typeDef,
  schema,
  graph,
  onCancel,
  onSaved
}: RecordEditorProps) {
  const { updateRecord, createRecord } = useDataset();
  const [recordId, setRecordId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [bodyValue, setBodyValue] = useState("");
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recordIdOptions = useMemo(
    () =>
      [...graph.nodesById.values()]
        .filter((node) => node.kind === "record")
        .map((node) => node.id)
        .sort((a, b) => a.localeCompare(b)),
    [graph]
  );

  useEffect(() => {
    const nextValues: Record<string, string> = {};
    for (const field of schema.fields) {
      if (schema.bodyField && field.name === schema.bodyField) {
        continue;
      }
      nextValues[field.name] = buildInitialValue(field, record);
    }
    setFieldValues(nextValues);
    if (mode === "edit" && record) {
      setRecordId(record.id);
    } else {
      setRecordId("");
    }
    if (record) {
      if (schema.bodyField) {
        const fallback = record.body || (typeof record.fields[schema.bodyField] === "string" ? record.fields[schema.bodyField] : "");
        setBodyValue(fallback || "");
      } else {
        setBodyValue(record.body || "");
      }
    } else {
      setBodyValue("");
    }
    setErrors(null);
  }, [mode, record, schema]);

  const handleFieldChange = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrors(null);
    const nextFields: Record<string, unknown> = {};
    for (const field of schema.fields) {
      if (schema.bodyField && field.name === schema.bodyField) {
        continue;
      }
      nextFields[field.name] = fieldToValue(field, fieldValues[field.name] ?? "");
    }
    if (schema.bodyField) {
      nextFields[schema.bodyField] = undefined;
    }

    if (mode === "edit" && record) {
      const result = await updateRecord({
        recordId: record.id,
        nextFields,
        nextBody: bodyValue
      });
      setIsSaving(false);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      onSaved(record.id);
      return;
    }

    const result = await createRecord({
      recordTypeId: typeDef.recordTypeId,
      id: recordId,
      fields: nextFields,
      body: bodyValue
    });
    setIsSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSaved(result.id);
  };

  return (
    <form className="form" onSubmit={(event) => event.preventDefault()}>
      {errors?.length ? (
        <div className="form-error" role="alert">
          <strong>Could not save record</strong>
          <ul>
            {errors.map((error, index) => (
              <li key={`${error.code}-${index}`}>
                {error.file ? `${error.file}: ` : ""}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mode === "create" ? (
        <div className="form-row">
          <label htmlFor="record-id">Record ID</label>
          <input
            id="record-id"
            type="text"
            value={recordId}
            onChange={(event) => setRecordId(event.target.value)}
            placeholder="record:example"
          />
        </div>
      ) : null}

      {schema.fields.map((field) => {
        if (schema.bodyField && field.name === schema.bodyField) {
          return null;
        }
        const id = `field-${field.name}`;
        const value = fieldValues[field.name] ?? "";
        return (
          <div className="form-row" key={field.name}>
            <label htmlFor={id}>
              {fieldLabel(field)}
              {field.required ? " *" : ""}
            </label>
            {field.kind === "enum" ? (
              <select id={id} value={value} onChange={(event) => handleFieldChange(field.name, event.target.value)}>
                <option value="">Select...</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.kind === "number" ? (
              <input
                id={id}
                type="number"
                value={value}
                onChange={(event) => handleFieldChange(field.name, event.target.value)}
              />
            ) : field.kind === "date" ? (
              <input
                id={id}
                type="date"
                value={value}
                onChange={(event) => handleFieldChange(field.name, event.target.value)}
              />
            ) : field.kind === "ref" ? (
              <>
                <input
                  id={id}
                  type="text"
                  list="record-id-options"
                  value={value}
                  onChange={(event) => handleFieldChange(field.name, event.target.value)}
                />
              </>
            ) : field.kind === "ref[]" ? (
              <textarea
                id={id}
                rows={4}
                value={value}
                onChange={(event) => handleFieldChange(field.name, event.target.value)}
                placeholder="One id per line"
              />
            ) : (
              <input
                id={id}
                type="text"
                value={value}
                onChange={(event) => handleFieldChange(field.name, event.target.value)}
              />
            )}
          </div>
        );
      })}

      <datalist id="record-id-options">
        {recordIdOptions.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>

      <div className="form-row">
        <label htmlFor="record-body">
          {schema.bodyField
            ? schema.fields.find((field) => field.name === schema.bodyField)?.label ?? schema.bodyField
            : "Body"}
        </label>
        <textarea
          id="record-body"
          rows={6}
          value={bodyValue}
          onChange={(event) => setBodyValue(event.target.value)}
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="button secondary"
          data-testid="cancel-edit"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button type="button" className="button" data-testid="save-record" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
