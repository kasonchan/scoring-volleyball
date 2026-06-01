"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Button, Card } from "@/components/ui";

const inputClassName =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

export function AuthForm({
  title,
  description,
  footer,
  onSubmit,
  submitLabel,
  children,
}: {
  title: string;
  description: string;
  footer: ReactNode;
  submitLabel: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  children: ReactNode;
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onSubmit(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {children}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Please wait…" : submitLabel}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
    </Card>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  hint,
  placeholder,
  defaultValue,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value === undefined ? undefined : value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={inputClassName}
      />
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
