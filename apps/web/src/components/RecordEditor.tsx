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
  const [fieldsObject, setFieldsObject] = useState<Record<string, unknown>>({});
  const [bodyValue, setBodyValue] = useState("");
  const [recordId, setRecordId] = useState("");
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [yamlError, setYamlError] = useState<string | null>(null);
  const isSchemaMode = Boolean(schema && schema.fields.length > 0 && !schemaError);

  useEffect(() => {
    if (mode === "edit" && record) {
      setBodyValue(record.body ?? "");
      setRecordId(record.id);
      const nextFields = record.fields ?? {};
      setFieldsObject(nextFields);
      setFieldsText(YAML.stringify(nextFields, { indent: 2 }));
    }
    if (mode === "create") {
      setBodyValue("");
      setRecordId("");
      setFieldsObject({});
      setFieldsText("{}");
    }
    setErrors(null);
    setYamlError(null);
  }, [mode, record]);

  useEffect(() => {
    if (isSchemaMode) {
      setFieldsText(YAML.stringify(fieldsObject ?? {}, { indent: 2 }));
    }
  }, [fieldsObject, isSchemaMode]);

  const parseFieldsText = (
    rawText: string
  ): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } => {
    try {
      const trimmed = rawText.trim();
      const parsed = trimmed ? YAML.parse(trimmed) : {};
      if (!isObject(parsed) || Array.isArray(parsed)) {
        return { ok: false, message: "Fields must be a YAML object." };
      }
      return { ok: true, value: parsed as Record<string, unknown> };
    } catch (err) {
      return {
        ok: false,
        message: `Fields YAML is invalid: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  };

  const handleFieldsTextChange = (value: string) => {
    setFieldsText(value);
    const parsed = parseFieldsText(value);
    if (parsed.ok) {
      setFieldsObject(parsed.value);
      setYamlError(null);
    } else {
      setYamlError(parsed.message);
    }
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setFieldsObject((prev) => {
      const next = { ...prev };
      if (value === undefined) {
        delete next[name];
      } else {
        next[name] = value;
      }
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedId = recordId.trim();
    const nextErrors: ValidationError[] = [];

    if (mode === "create" && !trimmedId) {
      nextErrors.push(makeError("E_USAGE", "Record ID is required."));
    }

    const nextFields: Record<string, unknown> = {};
    if (isSchemaMode) {
      if (yamlError) {
        nextErrors.push(makeError("E_USAGE", yamlError));
      } else {
        for (const [key, value] of Object.entries(fieldsObject)) {
          if (value !== undefined) {
            nextFields[key] = value;
          }
        }
      }
    } else {
      const parsed = parseFieldsText(fieldsText);
      if (!parsed.ok) {
        nextErrors.push(makeError("E_USAGE", parsed.message));
      } else {
        Object.assign(nextFields, parsed.value);
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
      {isSchemaMode ? (
        <>
          {schema?.fields.map((def) => (
            <SchemaFieldInput
              key={def.name}
              def={def}
              value={fieldsObject[def.name]}
              onChange={(value) => handleFieldChange(def.name, value)}
            />
          ))}
          <details className="form-row">
            <summary>Advanced: edit raw YAML</summary>
            {yamlError ? <div className="form-error">{yamlError}</div> : null}
            <textarea
              id="fields-yaml"
              data-testid="fields-yaml-editor"
              value={fieldsText}
              onChange={(event) => handleFieldsTextChange(event.target.value)}
              rows={12}
            />
            <p className="hint">Edit the record fields as YAML key/value data. This editor is schema-agnostic.</p>
          </details>
        </>
      ) : (
        <div className="form-row">
          <div className="form-row__inline">
            <label htmlFor="fields-yaml">Fields (YAML)</label>
          </div>
          <textarea
            id="fields-yaml"
            data-testid="fields-yaml-editor"
            value={fieldsText}
            onChange={(event) => handleFieldsTextChange(event.target.value)}
            rows={12}
          />
          <p className="hint">Edit the record fields as YAML key/value data. This editor is schema-agnostic.</p>
        </div>
      )}
      <div className="form-row">
        <label htmlFor="record-body">{schema?.bodyField || "Body"}</label>
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
