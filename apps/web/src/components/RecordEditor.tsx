import { type FormEvent, useEffect, useState } from "react";
import YAML from "yaml";
import type { GraphNode, GraphTypeDef } from "../../../../src/core/graph";
import type { ValidationError } from "../../../../src/core/errors";
import { makeError } from "../../../../src/core/errors";
import { isObject } from "../../../../src/core/types";
import { useDataset } from "../state/DatasetContext";
import type { TypeSchema } from "../schema/typeSchema";

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
  const [bodyValue, setBodyValue] = useState("");
  const [recordId, setRecordId] = useState("");
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && record) {
      setBodyValue(record.body ?? "");
      setRecordId(record.id);
      setFieldsText(YAML.stringify(record.fields ?? {}, { indent: 2 }));
    }
    if (mode === "create") {
      setBodyValue("");
      setRecordId("");
      setFieldsText("{}");
    }
    setErrors(null);
  }, [mode, record]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedId = recordId.trim();
    const nextErrors: ValidationError[] = [];

    if (mode === "create" && !trimmedId) {
      nextErrors.push(makeError("E_USAGE", "Record ID is required."));
    }

    const nextFields: Record<string, unknown> = {};
    const rawText = fieldsText.trim();
    try {
      const parsed = rawText ? YAML.parse(rawText) : {};
      if (!isObject(parsed) || Array.isArray(parsed)) {
        nextErrors.push(makeError("E_USAGE", "Fields must be a YAML object."));
      } else {
        Object.assign(nextFields, parsed as Record<string, unknown>);
      }
    } catch (err) {
      nextErrors.push(
        makeError("E_USAGE", `Fields YAML is invalid: ${err instanceof Error ? err.message : String(err)}`)
      );
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
      <div className="form-row">
        <div className="form-row__inline">
          <label htmlFor="fields-yaml">Fields (YAML)</label>
        </div>
        <textarea
          id="fields-yaml"
          data-testid="fields-yaml-editor"
          value={fieldsText}
          onChange={(event) => setFieldsText(event.target.value)}
          rows={12}
        />
        <p className="hint">Edit the record fields as YAML key/value data. This editor is schema-agnostic.</p>
      </div>
      <div className="form-row">
        <label htmlFor="record-body">Body</label>
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
