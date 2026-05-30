"use client";

import Link from "next/link";
import { Location, Team, fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/types";

export interface MatchFormValues {
  homeTeamId: string;
  awayTeamId: string;
  locationId: string;
  scheduledAtLocal: string;
}

interface MatchFormFieldsProps {
  teams: Team[];
  locations: Location[];
  values: MatchFormValues;
  onChange: (values: MatchFormValues) => void;
}

const selectClassName =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none";
const inputClassName =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

export function MatchFormFields({ teams, locations, values, onChange }: MatchFormFieldsProps) {
  function update(field: keyof MatchFormValues, value: string) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Home Team</label>
          <select
            required
            value={values.homeTeamId}
            onChange={(e) => update("homeTeamId", e.target.value)}
            className={selectClassName}
          >
            <option value="">Select team...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === values.awayTeamId}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Away Team</label>
          <select
            required
            value={values.awayTeamId}
            onChange={(e) => update("awayTeamId", e.target.value)}
            className={selectClassName}
          >
            <option value="">Select team...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === values.homeTeamId}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Location</label>
        {locations.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">
            No locations yet.{" "}
            <Link href="/admin/locations/new" className="text-orange-600 hover:underline">
              Add a location
            </Link>
          </p>
        ) : (
          <select
            value={values.locationId}
            onChange={(e) => update("locationId", e.target.value)}
            className={selectClassName}
          >
            <option value="">No location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Date & Time</label>
        <input
          type="datetime-local"
          value={values.scheduledAtLocal}
          onChange={(e) => update("scheduledAtLocal", e.target.value)}
          className={inputClassName}
        />
      </div>
    </div>
  );
}

export function matchFormValuesToPayload(values: MatchFormValues) {
  return {
    homeTeamId: values.homeTeamId,
    awayTeamId: values.awayTeamId,
    locationId: values.locationId || null,
    scheduledAt: fromDatetimeLocalValue(values.scheduledAtLocal),
  };
}

export function matchToFormValues(
  match: {
    homeTeamId: string;
    awayTeamId: string;
    locationId: string | null;
    scheduledAt: string | null;
  }
): MatchFormValues {
  return {
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    locationId: match.locationId ?? "",
    scheduledAtLocal: toDatetimeLocalValue(match.scheduledAt),
  };
}

export const emptyMatchFormValues: MatchFormValues = {
  homeTeamId: "",
  awayTeamId: "",
  locationId: "",
  scheduledAtLocal: "",
};
