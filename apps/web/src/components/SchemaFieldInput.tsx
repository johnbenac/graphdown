import type { ChangeEvent } from "react";
import { readRef, readRefs, writeRef, writeRefs } from "../schema/typeSchema";
import type { FieldDef } from "../schema/typeSchema";

type SchemaFieldInputProps = {
  def: FieldDef;
  value: unknown;
  onChange: (nextValue: unknown) => void;
};

function getStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  return String(value);
}

function handleNumberChange(event: ChangeEvent<HTMLInputElement>, onChange: (nextValue: unknown) => void) {
  const next = event.target.value.trim();
  if (!next) {
    onChange(undefined);
    return;
  }
  const parsed = Number(next);
  onChange(Number.isNaN(parsed) ? undefined : parsed);
}

export default function SchemaFieldInput({ def, value, onChange }: SchemaFieldInputProps) {
  const fieldId = `field-${def.name}`;
  const label = def.name;

  const hint = typeof def.label === "string" && def.label !== def.name ? def.label : null;

  if (def.kind === "enum" && Array.isArray(def.options) && def.options.every((option) => typeof option === "string")) {
    const options = def.options as string[];
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{label}</label>
        <select
          id={fieldId}
          value={getStringValue(value)}
          onChange={(event) => onChange(event.target.value || undefined)}
          required={Boolean(def.required)}
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {hint ? <p className="hint">{hint}</p> : null}
      </div>
    );
  }

  if (def.kind === "number") {
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{label}</label>
        <input
          id={fieldId}
          type="number"
          value={typeof value === "number" ? value : ""}
          onChange={(event) => handleNumberChange(event, onChange)}
          required={Boolean(def.required)}
        />
        {hint ? <p className="hint">{hint}</p> : null}
      </div>
    );
  }

  if (def.kind === "date") {
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{label}</label>
        <input
          id={fieldId}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          required={Boolean(def.required)}
        />
        {hint ? <p className="hint">{hint}</p> : null}
      </div>
    );
  }

  if (def.kind === "ref") {
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{label}</label>
        <input
          id={fieldId}
          type="text"
          value={readRef(value)}
          onChange={(event) => onChange(writeRef(event.target.value))}
          placeholder="record:example"
          required={Boolean(def.required)}
        />
        {hint ? <p className="hint">{hint}</p> : null}
      </div>
    );
  }

  if (def.kind === "ref[]") {
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{label}</label>
        <textarea
          id={fieldId}
          value={readRefs(value).join("\n")}
          onChange={(event) => {
            const lines = event.target.value.split("\n").map((line) => line.trim()).filter(Boolean);
            onChange(writeRefs(lines));
          }}
          rows={3}
          placeholder="record:one\nrecord:two"
          required={Boolean(def.required)}
        />
        {hint ? <p className="hint">{hint}</p> : null}
      </div>
    );
  }

  return (
    <div className="form-row">
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        type="text"
        value={getStringValue(value)}
        onChange={(event) => onChange(event.target.value || undefined)}
        required={Boolean(def.required)}
      />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
