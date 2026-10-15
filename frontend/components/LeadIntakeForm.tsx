"use client";

import { useState } from "react";
import type { LeadIn } from "@/lib/types";
import { validateLeadIn, type FieldErrors, type FieldName } from "@/lib/validate";
import { FieldError } from "./FieldError";
import styles from "./LeadIntakeForm.module.css";

const SECTIONS: { title: string; hint: string; fields: { name: FieldName; label: string; placeholder: string; textarea?: boolean; half?: boolean }[] }[] = [
  {
    title: "Contact",
    hint: "Who is this lead?",
    fields: [
      { name: "name", label: "Name", placeholder: "Priya Nair", half: true },
      { name: "location", label: "Location", placeholder: "Whitefield, Bengaluru", half: true },
    ],
  },
  {
    title: "Requirement",
    hint: "What do they want, and by when?",
    fields: [
      { name: "property_requirement", label: "Property requirement", placeholder: "3BHK apartment near ITPL" },
      { name: "budget", label: "Budget", placeholder: "12000000", half: true },
      { name: "buying_timeline", label: "Buying timeline", placeholder: "within 2 months", half: true },
    ],
  },
  {
    title: "Message",
    hint: "Paste what the customer actually said.",
    fields: [
      { name: "customer_message", label: "Customer message", placeholder: "My loan is approved and I want to visit this weekend…", textarea: true },
    ],
  },
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
      {SECTIONS.map((section) => (
        <fieldset key={section.title} className={styles.section}>
          <legend className={styles.legend}>
            {section.title} <span className={styles.legendHint}>{section.hint}</span>
          </legend>
          <div className={styles.grid}>
            {section.fields.map((f) => (
              <div key={f.name} className={`${styles.field} ${f.textarea ? styles.full : ""} ${f.half ? styles.half : ""}`}>
                <label htmlFor={f.name}>{f.label}</label>
                {f.textarea ? (
                  <textarea
                    id={f.name}
                    value={values[f.name]}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)}
                    disabled={disabled}
                    rows={4}
                  />
                ) : (
                  <input
                    id={f.name}
                    value={values[f.name]}
                    placeholder={f.placeholder}
                    onChange={(e) => set(f.name, e.target.value)}
                    disabled={disabled}
                    inputMode={f.name === "budget" ? "decimal" : undefined}
                  />
                )}
                <FieldError message={errors[f.name]} />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <button type="submit" disabled={disabled}>
        Save lead
      </button>
    </form>
  );
}
