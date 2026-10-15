"use client";

import { useState } from "react";
import type { LeadIn } from "@/lib/types";
import { validateLeadIn, type FieldErrors, type FieldName } from "@/lib/validate";
import { FieldError } from "./FieldError";
import styles from "./LeadIntakeForm.module.css";

const FIELDS: { name: FieldName; label: string; textarea?: boolean }[] = [
  { name: "name", label: "Name" },
  { name: "location", label: "Location" },
  { name: "property_requirement", label: "Property requirement" },
  { name: "budget", label: "Budget" },
  { name: "buying_timeline", label: "Buying timeline" },
  { name: "customer_message", label: "Customer message", textarea: true },
];

const EMPTY: Record<FieldName, string> = {
  name: "",
  location: "",
  property_requirement: "",
  budget: "",
  buying_timeline: "",
  customer_message: "",
};

export function LeadIntakeForm({
  onValidSubmit,
  disabled,
}: {
  onValidSubmit: (value: LeadIn) => Promise<void>;
  disabled?: boolean;
}) {
  const [values, setValues] = useState<Record<FieldName, string>>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});

  function set(field: FieldName, text: string) {
    setValues((v) => ({ ...v, [field]: text }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { errors: next, value } = validateLeadIn(values);
    setErrors(next);
    if (value) await onValidSubmit(value);
  }

  return (
    <form onSubmit={submit} noValidate className={styles.form}>
      {FIELDS.map((f) => (
        <div key={f.name} className={styles.field}>
          <label htmlFor={f.name}>{f.label}</label>
          {f.textarea ? (
            <textarea
              id={f.name}
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
              disabled={disabled}
              rows={4}
            />
          ) : (
            <input
              id={f.name}
              value={values[f.name]}
              onChange={(e) => set(f.name, e.target.value)}
              disabled={disabled}
              inputMode={f.name === "budget" ? "decimal" : undefined}
            />
          )}
          <FieldError message={errors[f.name]} />
        </div>
      ))}
      <button type="submit" disabled={disabled}>
        Save lead
      </button>
    </form>
  );
}
