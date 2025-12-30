import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { Graph, GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { ValidationError } from "../../../../src/core/errors";
import { makeError } from "../../../../src/core/errors";
import { useDataset } from "../state/DatasetContext";
import type { FieldDef, TypeSchema } from "../schema/typeSchema";
import { readRef, readRefs, writeRef, writeRefs } from "../schema/typeSchema";

type RecordEditorProps = {
  mode: "edit" | "create";
  schema?: TypeSchema;
  schemaError?: string;
  record?: GraphNode | null;
  typeDef: GraphTypeDef;
  graph: Graph;
  onCancel: () => void;
  onComplete: (recordId: string) => void;
};

function getFieldLabel(field: FieldDef) {
  return field.label ?? field.name;
}

function getBodyValue(record: GraphNode, bodyField?: string) {
  if (record.body) {
    return record.body;
  }
  if (bodyField && typeof record.fields[bodyField] === "string") {
    return String(record.fields[bodyField]);
  }
  return "";
}

export default function RecordEditor({
  mode,
  schema,
  schemaError,
  record,
  typeDef,
  graph,
  onCancel,
  onComplete
}: RecordEditorProps) {
  const { updateRecord, createRecord } = useDataset();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [bodyValue, setBodyValue] = useState("");
  const [recordId, setRecordId] = useState("");
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const schemaFields = schema?.fields ?? [];
  const bodyField = schema?.bodyField;
  const bodyFieldDef = schemaFields.find((field) => field.name === bodyField);

  const recordOptions = useMemo(() => {
    return [...graph.nodesById.values()]
      .filter((node) => node.kind === "record")
      .map((node) => node.id)
      .sort((a, b) => a.localeCompare(b));
  }, [graph]);

  useEffect(() => {
    if (mode === "edit" && record && schema) {
      const nextValues: Record<string, string> = {};
      for (const field of schemaFields) {
        if (field.name === bodyField) {
          continue;
        }
        const value = record.fields[field.name];
        switch (field.kind) {
          case "number":
            nextValues[field.name] = value === undefined || value === null ? "" : String(value);
            break;
          case "enum":
          case "string":
          case "date":
            nextValues[field.name] = typeof value === "string" || typeof value === "number" ? String(value) : "";
            break;
          case "ref":
            nextValues[field.name] = readRef(value);
            break;
          case "ref[]":
            nextValues[field.name] = readRefs(value).join("\n");
            break;
          default:
            nextValues[field.name] = "";
        }
      }
      setFieldValues(nextValues);
      setBodyValue(getBodyValue(record, bodyField));
      setRecordId(record.id);
    }
    if (mode === "create") {
      const nextValues: Record<string, string> = {};
      for (const field of schemaFields) {
        if (field.name === bodyField) {
          continue;
        }
        nextValues[field.name] = "";
      }
      setFieldValues(nextValues);
      setBodyValue("");
      setRecordId("");
    }
    setErrors(null);
  }, [mode, record, schema, schemaFields, bodyField]);

  const listId = `record-id-options-${typeDef.recordTypeId}`;

  const updateFieldValue = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!schema) {
      setErrors([makeError("E_USAGE", "Schema is unavailable for this record type.")]);
      return;
    }
    const trimmedId = recordId.trim();
    const nextFields: Record<string, unknown> = {};
    const nextErrors: ValidationError[] = [];

    if (mode === "create" && !trimmedId) {
      nextErrors.push(makeError("E_USAGE", "Record ID is required."));
    }

    for (const field of schemaFields) {
      if (field.name === bodyField) {
        continue;
      }
      const rawValue = fieldValues[field.name] ?? "";
      const trimmed = rawValue.trim();
      if (field.required && !trimmed) {
        nextErrors.push(makeError("E_USAGE", `${getFieldLabel(field)} is required.`));
        continue;
      }
      switch (field.kind) {
        case "number":
          if (!trimmed) {
            nextFields[field.name] = undefined;
            break;
          }
          {
            const parsed = Number(trimmed);
            if (Number.isNaN(parsed)) {
              nextErrors.push(makeError("E_USAGE", `${getFieldLabel(field)} must be a number.`));
              break;
            }
            nextFields[field.name] = parsed;
          }
          break;
        case "enum":
        case "string":
        case "date":
          nextFields[field.name] = trimmed || undefined;
          break;
        case "ref":
          nextFields[field.name] = writeRef(trimmed);
          break;
        case "ref[]":
          nextFields[field.name] = writeRefs(
            trimmed ? trimmed.split("\n").map((line) => line.trim()).filter(Boolean) : []
          );
          break;
        default:
          break;
      }
    }

    if (bodyField) {
      nextFields[bodyField] = undefined;
    }

    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setErrors(null);
    try {
      if (mode === "edit" && record) {
        const result = await updateRecord({
          recordId: record.id,
          nextFields,
          nextBody: bodyValue
        });
        if (result.ok) {
          onComplete(record.id);
          return;
        }
        setErrors(result.errors);
      } else if (mode === "create") {
        const result = await createRecord({
          recordTypeId: typeDef.recordTypeId,
          id: trimmedId,
          fields: nextFields,
          body: bodyValue
        });
        if (result.ok) {
          onComplete(result.id);
          return;
        }
        setErrors(result.errors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {schemaError ? <div className="form-error">{schemaError}</div> : null}
      {errors?.length ? (
        <div className="form-error" role="alert">
          <strong>Validation errors</strong>
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
            required
          />
        </div>
      ) : null}
      {schema ? (
        schemaFields.map((field) => {
          if (field.name === bodyField) {
            return (
              <div key={field.name} className="form-row">
                <label htmlFor={`field-${field.name}`}>{getFieldLabel(field)}</label>
                <textarea
                  id={`field-${field.name}`}
                  value={bodyValue}
                  onChange={(event) => setBodyValue(event.target.value)}
                  rows={6}
                />
              </div>
            );
          }
          const value = fieldValues[field.name] ?? "";
          if (field.kind === "enum") {
            return (
              <div key={field.name} className="form-row">
                <label htmlFor={`field-${field.name}`}>{getFieldLabel(field)}</label>
                <select
                  id={`field-${field.name}`}
                  value={value}
                  onChange={(event) => updateFieldValue(field.name, event.target.value)}
                >
                  <option value="">Select…</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          if (field.kind === "ref") {
            return (
              <div key={field.name} className="form-row">
                <label htmlFor={`field-${field.name}`}>{getFieldLabel(field)}</label>
                <input
                  id={`field-${field.name}`}
                  type="text"
                  list={listId}
                  value={value}
                  onChange={(event) => updateFieldValue(field.name, event.target.value)}
                />
              </div>
            );
          }
          if (field.kind === "ref[]") {
            return (
              <div key={field.name} className="form-row">
                <label htmlFor={`field-${field.name}`}>{getFieldLabel(field)}</label>
                <textarea
                  id={`field-${field.name}`}
                  value={value}
                  onChange={(event) => updateFieldValue(field.name, event.target.value)}
                  rows={4}
                  placeholder="one id per line"
                />
              </div>
            );
          }
          return (
            <div key={field.name} className="form-row">
              <label htmlFor={`field-${field.name}`}>{getFieldLabel(field)}</label>
              <input
                id={`field-${field.name}`}
                type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
                value={value}
                onChange={(event) => updateFieldValue(field.name, event.target.value)}
              />
            </div>
          );
        })
      ) : (
        <p>No schema fields defined for this record type.</p>
      )}
      {schema && bodyField && !bodyFieldDef ? (
        <div className="form-row">
          <label htmlFor={`field-${bodyField}`}>{bodyField}</label>
          <textarea
            id={`field-${bodyField}`}
            value={bodyValue}
            onChange={(event) => setBodyValue(event.target.value)}
            rows={6}
          />
        </div>
      ) : null}
      {!bodyField ? (
        <div className="form-row">
          <label htmlFor="record-body">Body</label>
          <textarea
            id="record-body"
            value={bodyValue}
            onChange={(event) => setBodyValue(event.target.value)}
            rows={6}
          />
        </div>
      ) : null}
      <datalist id={listId}>
        {recordOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <div className="form-actions">
        <button type="submit" className="button" disabled={isSaving || !schema} data-testid="save-record">
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button type="button" className="button secondary" onClick={onCancel} data-testid="cancel-edit">
          Cancel
        </button>
      </div>
    </form>
  );
}
