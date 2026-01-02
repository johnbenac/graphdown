import type { ChangeEvent } from "react";
import type { FieldDef } from "../schema/typeSchema";
import { readRef, readRefs, writeRef, writeRefs } from "../schema/typeSchema";

type SchemaFieldInputProps = {
  def: FieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const toDisplayString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
};

export default function SchemaFieldInput({ def, value, onChange }: SchemaFieldInputProps) {
  const fieldId = `field-${def.name}`;
  const labelText = def.name;

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    onChange(next === "" ? undefined : next);
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw === "") {
      onChange(undefined);
      return;
    }
    const parsed = Number(raw);
    onChange(Number.isNaN(parsed) ? undefined : parsed);
  };

  if (def.kind === "enum" && isStringArray(def.options)) {
    const selected = typeof value === "string" ? value : "";
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{labelText}</label>
        <select
          id={fieldId}
          value={selected}
          onChange={(event) => onChange(event.target.value || undefined)}
          required={def.required}
        >
          <option value="">Select…</option>
          {def.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (def.kind === "number") {
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{labelText}</label>
        <input
          id={fieldId}
          type="number"
          value={toDisplayString(value)}
          onChange={handleNumberChange}
          required={def.required}
        />
      </div>
    );
  }

  if (def.kind === "date") {
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{labelText}</label>
        <input
          id={fieldId}
          type="date"
          value={toDisplayString(value)}
          onChange={handleTextChange}
          required={def.required}
        />
      </div>
    );
  }

  if (def.kind === "ref") {
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{labelText}</label>
        <input
          id={fieldId}
          type="text"
          value={readRef(value)}
          onChange={(event) => onChange(writeRef(event.target.value))}
          required={def.required}
        />
      </div>
    );
  }

  if (def.kind === "ref[]") {
    const displayValue = readRefs(value).join("\n");
    return (
      <div className="form-row">
        <label htmlFor={fieldId}>{labelText}</label>
        <textarea
          id={fieldId}
          value={displayValue}
          onChange={(event) => {
            const lines = event.target.value
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean);
            onChange(writeRefs(lines));
          }}
          rows={4}
          required={def.required}
        />
      </div>
    );
  }

  return (
    <div className="form-row">
      <label htmlFor={fieldId}>{labelText}</label>
      <input
        id={fieldId}
        type="text"
        value={toDisplayString(value)}
        onChange={handleTextChange}
        required={def.required}
      />
    </div>
  );
}
