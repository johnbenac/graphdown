import { type FormEvent, useEffect, useState } from "react";
import YAML from "yaml";
import type { GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { ValidationError } from "../../../../src/core/errors";
import { makeError } from "../../../../src/core/errors";
import { isObject } from "../../../../src/core/types";
import { useDataset } from "../state/DatasetContext";
import type { TypeSchema } from "../schema/typeSchema";
import SchemaFieldInput from "./SchemaFieldInput";

type RecordEditorProps = {
  mode: "edit" | "create";
  schema?: TypeSchema;
  schemaError?: string;
  record?: GraphNode | null;
  typeDef: GraphTypeDef;
  onCancel: () => void;
  onComplete: (recordId: string) => void;
};

const EMPTY_FIELDS: Record<string, unknown> = {};

export default function RecordEditor({
  mode,
  schema,
  schemaError,
  record,
  typeDef,
  onCancel,
  onComplete
}: RecordEditorProps) {
  const { updateRecord, createRecord } = useDataset();
  const [fieldsText, setFieldsText] = useState("{}");
  const [fieldsObject, setFieldsObject] = useState<Record<string, unknown>>(EMPTY_FIELDS);
  const [bodyValue, setBodyValue] = useState("");
  const [recordId, setRecordId] = useState("");
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingRaw, setIsEditingRaw] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);

  const hasSchemaFields = Boolean(schema && schema.fields.length > 0);
  const useSchemaMode = hasSchemaFields && !schemaError;

  useEffect(() => {
    if (!isEditingRaw) {
      setFieldsText(YAML.stringify(fieldsObject ?? EMPTY_FIELDS, { indent: 2 }));
    }
  }, [fieldsObject, isEditingRaw]);

  useEffect(() => {
    if (mode === "edit" && record) {
      const nextFields = record.fields ?? EMPTY_FIELDS;
      setBodyValue(record.body ?? "");
      setRecordId(record.id);
      setFieldsObject(nextFields);
      setFieldsText(YAML.stringify(nextFields, { indent: 2 }));
    }
    if (mode === "create") {
      setBodyValue("");
      setRecordId("");
      setFieldsText("{}");
      setFieldsObject(EMPTY_FIELDS);
    }
    setErrors(null);
    setRawError(null);
    setIsEditingRaw(false);
  }, [mode, record]);

  const updateFieldValue = (fieldName: string, nextValue: unknown) => {
    setFieldsObject((current) => {
      const next = { ...current };
      if (nextValue === undefined) {
        delete next[fieldName];
      } else {
        next[fieldName] = nextValue;
      }
      return next;
    });
  };

  const handleRawFieldsChange = (nextValue: string) => {
    setIsEditingRaw(true);
    setFieldsText(nextValue);
    const rawText = nextValue.trim();
    if (!rawText) {
      setFieldsObject(EMPTY_FIELDS);
      setRawError(null);
      return;
    }
    try {
      const parsed = YAML.parse(rawText);
      if (!isObject(parsed) || Array.isArray(parsed)) {
        setRawError("Fields must be a YAML object.");
        return;
      }
      setFieldsObject(parsed as Record<string, unknown>);
      setRawError(null);
    } catch (err) {
      setRawError(`Fields YAML is invalid: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedId = recordId.trim();
    const nextErrors: ValidationError[] = [];
    let nextFields: Record<string, unknown> = { ...fieldsObject };

    if (mode === "create" && !trimmedId) {
      nextErrors.push(makeError("E_USAGE", "Record ID is required."));
    }

    if (!useSchemaMode || isEditingRaw) {
      const rawText = fieldsText.trim();
      try {
        const parsed = rawText ? YAML.parse(rawText) : {};
        if (!isObject(parsed) || Array.isArray(parsed)) {
          nextErrors.push(makeError("E_USAGE", "Fields must be a YAML object."));
        } else {
          nextFields = parsed as Record<string, unknown>;
        }
      } catch (err) {
        nextErrors.push(
          makeError("E_USAGE", `Fields YAML is invalid: ${err instanceof Error ? err.message : String(err)}`)
        );
      }
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
      {useSchemaMode ? (
        <div className="form-section">
          {schema?.fields.map((fieldDef) => (
            <SchemaFieldInput
              key={fieldDef.name}
              def={fieldDef}
              value={fieldsObject[fieldDef.name]}
              onChange={(nextValue) => updateFieldValue(fieldDef.name, nextValue)}
            />
          ))}
          <details className="form-row">
            <summary>Advanced: edit raw YAML</summary>
            <div className="form-row">
              <div className="form-row__inline">
                <label htmlFor="fields-yaml">Fields (YAML)</label>
              </div>
              <textarea
                id="fields-yaml"
                data-testid="fields-yaml-editor"
                value={fieldsText}
                onChange={(event) => handleRawFieldsChange(event.target.value)}
                onBlur={() => setIsEditingRaw(false)}
                rows={12}
              />
              {rawError ? <p className="form-error">{rawError}</p> : null}
              <p className="hint">Edit the record fields as YAML key/value data.</p>
            </div>
          </details>
        </div>
      ) : (
        <div className="form-row">
          <div className="form-row__inline">
            <label htmlFor="fields-yaml">Fields (YAML)</label>
          </div>
          <textarea
            id="fields-yaml"
            data-testid="fields-yaml-editor"
            value={fieldsText}
            onChange={(event) => handleRawFieldsChange(event.target.value)}
            onBlur={() => setIsEditingRaw(false)}
            rows={12}
          />
          {rawError ? <p className="form-error">{rawError}</p> : null}
          <p className="hint">Edit the record fields as YAML key/value data. This editor is schema-agnostic.</p>
        </div>
      )}
      <div className="form-row">
        <label htmlFor="record-body">{schema?.bodyField ?? "Body"}</label>
        <textarea
          id="record-body"
          value={bodyValue}
          onChange={(event) => setBodyValue(event.target.value)}
          rows={6}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="button" disabled={isSaving} data-testid="save-record">
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button type="button" className="button secondary" onClick={onCancel} data-testid="cancel-edit">
          Cancel
        </button>
      </div>
    </form>
  );
}
