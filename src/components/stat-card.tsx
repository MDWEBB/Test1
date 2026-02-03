"use client";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  subColor?: string;
}

export function StatCard({ label, value, subValue, subColor }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {subValue && (
        <p className={`mt-0.5 text-sm ${subColor || "text-zinc-400"}`}>
          {subValue}
        </p>
      )}
    </div>
  );
}
