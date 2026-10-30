import type { ReactNode } from "react";

type SettingsSectionProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SettingsSection({
  title,
  description,
  icon,
  children,
  className = "",
}: SettingsSectionProps) {
  return (
    <section
      className={`rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8 ${className}`}
    >
      <header className="mb-6 flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          {icon}
        </span>
        <div>
          <h2 className="m-0 text-lg font-bold text-ink">{title}</h2>
          {description && (
            <p className="mb-0 mt-1 text-sm leading-6 text-muted">
              {description}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}
