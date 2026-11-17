/** Shape returned by form actions to useActionState. */
export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  /** Changes on every success so forms can reset themselves. */
  okAt?: number;
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};
