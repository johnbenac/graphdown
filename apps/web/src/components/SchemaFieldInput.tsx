import type { ChangeEvent } from "react";
import { readRef, readRefs, writeRef, writeRefs, type FieldDef } from "../schema/typeSchema";

const enumKinds = new Set(["enum", "string", "number", "date", "ref", "ref[]"]);

type SchemaFieldInputProps = {
  def: FieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
};

function toDisplayString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

export default function SchemaFieldInput({ def, value, onChange }: SchemaFieldInputProps) {
  const inputId = `field-${def.name}`;
  const required = Boolean(def.required);
  const labelHint = typeof def.label === "string" ? def.label : null;

  if (!enumKinds.has(def.kind)) {
    return (
      <div className="form-row">
        <label htmlFor={inputId}>{def.name}</label>
        <input
          id={inputId}
          type="text"
          value={toDisplayString(value)}
          onChange={(event) => onChange(event.target.value || undefined)}
          required={required}
        />
        {labelHint ? <p className="hint">{labelHint}</p> : null}
      </div>
    );
  }

  if (def.kind === "number") {
    const displayValue = typeof value === "number" ? String(value) : "";
    return (
      <div className="form-row">
        <label htmlFor={inputId}>{def.name}</label>
        <input
          id={inputId}
          type="number"
          value={displayValue}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next === "" ? undefined : Number(next));
          }}
          required={required}
        />
        {labelHint ? <p className="hint">{labelHint}</p> : null}
      </div>
    );
  }

  if (def.kind === "enum" && Array.isArray(def.options) && def.options.every((option) => typeof option === "string")) {
    const options = def.options as string[];
    return (
      <div className="form-row">
        <label htmlFor={inputId}>{def.name}</label>
        <select
          id={inputId}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          required={required}
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {labelHint ? <p className="hint">{labelHint}</p> : null}
      </div>
    );
  }

  if (def.kind === "date") {
    return (
      <div className="form-row">
        <label htmlFor={inputId}>{def.name}</label>
        <input
          id={inputId}
          type="date"
          value={toDisplayString(value)}
          onChange={(event) => onChange(event.target.value || undefined)}
          required={required}
        />
        {labelHint ? <p className="hint">{labelHint}</p> : null}
      </div>
    );
  }

  if (def.kind === "ref") {
    return (
      <div className="form-row">
        <label htmlFor={inputId}>{def.name}</label>
        <input
          id={inputId}
          type="text"
          value={readRef(value)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const nextRaw = event.target.value;
            onChange(nextRaw ? writeRef(nextRaw) : undefined);
          }}
          required={required}
        />
        {labelHint ? <p className="hint">{labelHint}</p> : null}
      </div>
    );
  }

  if (def.kind === "ref[]") {
    return (
      <div className="form-row">
        <label htmlFor={inputId}>{def.name}</label>
        <textarea
          id={inputId}
          rows={4}
          value={readRefs(value).join("\n")}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
            const lines = event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);
            onChange(lines.length ? writeRefs(lines) : undefined);
          }}
          required={required}
        />
        {labelHint ? <p className="hint">{labelHint}</p> : null}
      </div>
    );
  }

  return (
    <div className="form-row">
      <label htmlFor={inputId}>{def.name}</label>
      <input
        id={inputId}
        type="text"
        value={toDisplayString(value)}
        onChange={(event) => onChange(event.target.value || undefined)}
        required={required}
      />
      {labelHint ? <p className="hint">{labelHint}</p> : null}
    </div>
  );
}
