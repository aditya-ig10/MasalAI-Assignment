import type { LeadIn } from "./types";

export type FieldName =
  | "name"
  | "location"
  | "property_requirement"
  | "budget"
  | "buying_timeline"
  | "customer_message";

export type FieldErrors = Partial<Record<FieldName, string>>;

const REQUIRED: FieldName[] = ["name", "location", "property_requirement", "buying_timeline", "customer_message"];

export function validateLeadIn(input: Record<FieldName, string>): {
  errors: FieldErrors;
  value: LeadIn | null;
} {
  const errors: FieldErrors = {};
  for (const field of REQUIRED) {
    if (input[field].trim() === "") errors[field] = "This field is required.";
  }
  const budget = Number(input.budget.trim());
  if (!Number.isFinite(budget) || budget <= 0) errors.budget = "Enter a budget above zero.";
  if (Object.keys(errors).length > 0) return { errors, value: null };
  return {
    errors,
    value: {
      name: input.name.trim(),
      location: input.location.trim(),
      property_requirement: input.property_requirement.trim(),
      budget,
      buying_timeline: input.buying_timeline.trim(),
      customer_message: input.customer_message.trim(),
    },
  };
}
