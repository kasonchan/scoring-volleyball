import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "score-home" | "score-away";
}) {
  const variants = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:bg-slate-50",
    danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
    "score-home": "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 text-xl font-bold py-6",
    "score-away": "bg-teal-600 text-white hover:bg-teal-700 active:scale-95 text-xl font-bold py-6",
  };
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-800",
    orange: "bg-orange-100 text-orange-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color] ?? colors.slate}`}>
      {children}
    </span>
  );
}
