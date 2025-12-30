import { useEffect, useMemo, useState } from "react";
import type { ValidationError } from "../../../../src/core/errors";
import { makeError } from "../../../../src/core/errors";
import type { Graph, GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import {
  readRef,
  readRefs,
  type FieldDef,
  type TypeSchema,
  writeRef,
  writeRefs
} from "../schema/typeSchema";
import { useDataset } from "../state/DatasetContext";

type RecordEditorProps = {
  mode: "edit" | "create";
  record?: GraphNode | null;
  typeDef: GraphTypeDef;
  schema: TypeSchema;
  graph: Graph;
  onCancel: () => void;
  onSaved: (id: string) => void;
};

type FieldValueMap = Record<string, string>;

function getFieldLabel(field: FieldDef) {
  return field.label ?? field.name;
}

function getBodyValue(record: GraphNode | null | undefined, schema: TypeSchema): string {
  if (!record) {
    return "";
  }
  if (record.body) {
    return record.body;
  }
  if (schema.bodyField) {
    const fallback = record.fields?.[schema.bodyField];
    return typeof fallback === "string" ? fallback : "";
  }
  return "";
}

function getFieldValue(field: FieldDef, record: GraphNode | null | undefined): string {
  if (!record) {
    return "";
  }
  const raw = record.fields?.[field.name];
  if (field.kind === "ref") {
    return readRef(raw);
  }
  if (field.kind === "ref[]") {
    return readRefs(raw).join("\n");
  }
  if (field.kind === "number") {
    if (typeof raw === "number") {
      return String(raw);
    }
  }
  return typeof raw === "string" ? raw : "";
}

function buildFieldPayload(fieldDefs: FieldDef[], values: FieldValueMap): Record<string, unknown> {
  const nextFields: Record<string, unknown> = {};
  for (const field of fieldDefs) {
    const rawValue = values[field.name] ?? "";
    const trimmedValue = rawValue.trim();
    if (field.kind === "ref") {
      const value = writeRef(trimmedValue);
      if (value !== undefined) {
        nextFields[field.name] = value;
      }
      continue;
    }
    if (field.kind === "ref[]") {
      const lines = rawValue.split("\n").map((line) => line.trim()).filter(Boolean);
      const value = writeRefs(lines);
      if (value !== undefined) {
        nextFields[field.name] = value;
      }
      continue;
    }
    if (!trimmedValue) {
      continue;
    }
    if (field.kind === "number") {
      const parsed = Number(trimmedValue);
      if (!Number.isNaN(parsed)) {
        nextFields[field.name] = parsed;
      }
      continue;
    }
    nextFields[field.name] = trimmedValue;
  }
  return nextFields;
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
  const { createRecord, updateRecord } = useDataset();
  const [recordId, setRecordId] = useState("");
  const [fieldValues, setFieldValues] = useState<FieldValueMap>({});
  const [bodyValue, setBodyValue] = useState("");
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { bodyFieldDef, fieldDefs } = useMemo(() => {
    const bodyFieldName = schema.bodyField;
    return {
      bodyFieldDef: schema.fields.find((field) => field.name === bodyFieldName),
      fieldDefs: schema.fields.filter((field) => field.name !== bodyFieldName)
    };
  }, [schema]);
  const bodyFieldName = schema.bodyField;

  const recordIdOptions = useMemo(() => {
    return [...graph.nodesById.values()]
      .filter((node) => node.kind === "record")
      .map((node) => node.id)
      .sort((a, b) => a.localeCompare(b));
  }, [graph]);

  useEffect(() => {
    setErrors(null);
    setIsSaving(false);
    setRecordId(mode === "edit" && record ? record.id : "");
    const nextValues: FieldValueMap = {};
    for (const field of fieldDefs) {
      nextValues[field.name] = getFieldValue(field, record);
    }
    setFieldValues(nextValues);
    setBodyValue(getBodyValue(record, schema));
  }, [mode, record, schema, fieldDefs]);

  const handleFieldChange = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }
    setErrors(null);
    setIsSaving(true);
    const nextBody = bodyValue;
    if (mode === "create") {
      const trimmedId = recordId.trim();
      if (!trimmedId) {
        setErrors([makeError("E_INTERNAL", "Record ID is required.")]);
        setIsSaving(false);
        return;
      }
      const nextFields = buildFieldPayload(fieldDefs, fieldValues);
      const result = await createRecord({
        recordTypeId: typeDef.recordTypeId,
        id: trimmedId,
        fields: nextFields,
        body: nextBody
      });
      if (!result.ok) {
        setErrors(result.errors);
        setIsSaving(false);
        return;
      }
      onSaved(result.id);
      setIsSaving(false);
      return;
    }

    if (!record) {
      setErrors([makeError("E_INTERNAL", "No record selected.")]);
      setIsSaving(false);
      return;
    }

    const updates = buildFieldPayload(fieldDefs, fieldValues);
    if (bodyFieldName) {
      updates[bodyFieldName] = undefined;
    }
    const result = await updateRecord({
      recordId: record.id,
      nextFields: updates,
      nextBody
    });
    if (!result.ok) {
      setErrors(result.errors);
      setIsSaving(false);
      return;
    }
    onSaved(record.id);
    setIsSaving(false);
  };

  const renderFieldInput = (field: FieldDef) => {
    const value = fieldValues[field.name] ?? "";
    const inputId = `field-${field.name}`;
    if (field.kind === "enum") {
      return (
        <select id={inputId} value={value} onChange={(event) => handleFieldChange(field.name, event.target.value)}>
          <option value="">Select...</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    if (field.kind === "ref") {
      return (
        <>
          <input
            id={inputId}
            type="text"
            list="record-id-options"
            value={value}
            onChange={(event) => handleFieldChange(field.name, event.target.value)}
          />
        </>
      );
    }
    if (field.kind === "ref[]") {
      return (
        <textarea
          id={inputId}
          value={value}
          rows={4}
          onChange={(event) => handleFieldChange(field.name, event.target.value)}
        />
      );
    }
    if (field.kind === "number") {
      return (
        <input
          id={inputId}
          type="number"
          value={value}
          onChange={(event) => handleFieldChange(field.name, event.target.value)}
        />
      );
    }
    if (field.kind === "date") {
      return (
        <input
          id={inputId}
          type="date"
          value={value}
          onChange={(event) => handleFieldChange(field.name, event.target.value)}
        />
      );
    }
    return (
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(event) => handleFieldChange(field.name, event.target.value)}
      />
    );
  };

  const hasFields = fieldDefs.length > 0;
  const bodyLabel = bodyFieldDef ? getFieldLabel(bodyFieldDef) : "Body";

  return (
    <div className="record-editor">
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
      <div className="form" aria-label="Record editor">
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
        {hasFields ? (
          fieldDefs.map((field) => (
            <div className="form-row" key={field.name}>
              <label htmlFor={`field-${field.name}`}>{getFieldLabel(field)}</label>
              {renderFieldInput(field)}
            </div>
          ))
        ) : (
          <p>No schema fields defined.</p>
        )}
        <div className="form-row">
          <label htmlFor="record-body">{bodyLabel}</label>
          <textarea
            id="record-body"
            value={bodyValue}
            rows={6}
            onChange={(event) => setBodyValue(event.target.value)}
          />
        </div>
        <datalist id="record-id-options">
          {recordIdOptions.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
        <div className="form-actions">
          <button
            type="button"
            className="button"
            data-testid="save-record"
            onClick={handleSave}
            disabled={isSaving}
          >
            Save
          </button>
          <button
            type="button"
            className="button secondary"
            data-testid="cancel-edit"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
