import { type FormEvent, useEffect, useState } from "react";
import YAML from "yaml";
import type { RecordLinkGraphRecordNode, RecordLinkGraphTypeNode } from "@graphdown/core";
import type { ValidationError } from "@graphdown/core";
import { makeError } from "@graphdown/core";
import { isObject } from "@graphdown/core";
import { useDataset } from "../state/DatasetContext";

type RecordEditorProps = {
  mode: "edit" | "create";
  record?: RecordLinkGraphRecordNode | null;
  typeDef: RecordLinkGraphTypeNode;
  onCancel: () => void;
  onComplete: (recordKey: string) => void;
};

export default function RecordEditor({
  mode,
  record,
  typeDef,
  onCancel,
  onComplete
}: RecordEditorProps) {
  const { updateRecord, createRecord } = useDataset();
  const [fieldsText, setFieldsText] = useState("{}");
  const [fieldsTextError, setFieldsTextError] = useState<string | null>(null);
  const [bodyValue, setBodyValue] = useState("");
  const [recordId, setRecordId] = useState("");
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bodyLabel = "Body";

  useEffect(() => {
    if (mode === "edit" && record) {
      setBodyValue(record.body ?? "");
      setRecordId(record.recordId);
      setFieldsText(YAML.stringify(record.fields ?? {}, { indent: 2 }));
    }
    if (mode === "create") {
      setBodyValue("");
      setRecordId("");
      setFieldsText("{}");
    }
    setFieldsTextError(null);
    setErrors(null);
  }, [mode, record]);

  const handleFieldsTextChange = (nextText: string) => {
    setFieldsText(nextText);
    const rawText = nextText.trim();
    if (!rawText) {
      setFieldsTextError(null);
      return;
    }
    try {
      const parsed = YAML.parse(rawText);
      if (!isObject(parsed) || Array.isArray(parsed)) {
        setFieldsTextError("Fields must be a YAML object.");
        return;
      }
      setFieldsTextError(null);
    } catch (err) {
      setFieldsTextError(`Fields YAML is invalid: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedId = recordId.trim();
    const nextErrors: ValidationError[] = [];

    if (mode === "create" && !trimmedId) {
      nextErrors.push(makeError("E_USAGE", "Record ID is required."));
    }

    let nextFields: Record<string, unknown> = {};
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
          recordKey: record.recordKey,
          nextFields,
          nextBody: bodyValue
        });
        if (result.ok) {
          onComplete(record.recordKey);
          return;
        }
        setErrors(result.errors);
      } else if (mode === "create") {
        const result = await createRecord({
          typeId: typeDef.typeId,
          recordId: trimmedId,
          fields: nextFields,
          body: bodyValue
        });
        if (result.ok) {
          onComplete(result.recordKey);
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
            placeholder="example"
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
          onChange={(event) => handleFieldsTextChange(event.target.value)}
          rows={12}
        />
        {fieldsTextError ? <p className="hint form-error">{fieldsTextError}</p> : null}
        <p className="hint">Edit the record fields as YAML key/value data. This editor is schema-agnostic.</p>
      </div>
      <div className="form-row">
        <label htmlFor="record-body">{bodyLabel}</label>
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
