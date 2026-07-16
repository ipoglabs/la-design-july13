// src/posting/config/types.ts
export type FieldSpec = {
  key: string;
  type: "string" | "number" | "currency" | "date" | "array" | "boolean";
  label: string;
  required?: boolean;
};
