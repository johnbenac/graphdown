import type { ChangeEvent } from "react";
import { readRef, readRefs, writeRef, writeRefs } from "../schema/typeSchema";
import type { FieldDef } from "../schema/typeSchema";

type SchemaFieldInputProps = {
  def: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
};

function buildId(name: string) {
  return `field-${name}`;
}

function normalizeTextValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export default function SchemaFieldInput({ def, value, onChange }: SchemaFieldInputProps) {
  const inputId = buildId(def.name);
  const required = Boolean(def.required);

  const handleTextChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    onChange(nextValue.trim() === "" ? undefined : nextValue);
  };

  let input: JSX.Element;

  switch (def.kind) {
    case "number": {
      const textValue = value == null ? "" : String(value);
      input = (
        <input
          id={inputId}
          type="number"
          value={textValue}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw.trim() === "") {
              onChange(undefined);
              return;
            }
            const parsed = Number(raw);
            onChange(Number.isFinite(parsed) ? parsed : raw);
          }}
          required={required}
        />
      );
      break;
    }
    case "enum": {
      const options =
        Array.isArray(def.options) && def.options.every((item) => typeof item === "string")
          ? (def.options as string[])
          : null;
      if (options) {
        input = (
          <select
            id={inputId}
            value={normalizeTextValue(value)}
            onChange={(event) => {
              const nextValue = event.target.value;
              onChange(nextValue.trim() === "" ? undefined : nextValue);
            }}
            required={required}
          >
            {required ? null : <option value="">Select...</option>}
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      } else {
        input = (
          <input id={inputId} type="text" value={normalizeTextValue(value)} onChange={handleTextChange} required={required} />
        );
      }
      break;
    }
    case "date": {
      input = (
        <input id={inputId} type="date" value={normalizeTextValue(value)} onChange={handleTextChange} required={required} />
      );
      break;
    }
    case "ref": {
      input = (
        <input
          id={inputId}
          type="text"
          value={readRef(value)}
          onChange={(event) => onChange(writeRef(event.target.value))}
          required={required}
        />
      );
      break;
    }
    case "ref[]": {
      input = (
        <textarea
          id={inputId}
          rows={4}
          value={readRefs(value).join("\n")}
          onChange={(event) => {
            const lines = event.target.value.split("\n").map((line) => line.trim()).filter(Boolean);
            onChange(writeRefs(lines));
          }}
          required={required}
        />
      );
      break;
    }
    default: {
      input = (
        <input id={inputId} type="text" value={normalizeTextValue(value)} onChange={handleTextChange} required={required} />
      );
      break;
    }
  }

  return (
    <div className="form-row">
      <label htmlFor={inputId}>{def.name}</label>
      {input}
    </div>
  );
}
