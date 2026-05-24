import { FEATURES, type FeatureKey, STATUS_STYLE, type Status } from "../lib/feature-status";

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style.className}`}
      title={label ?? style.label}
    >
      {style.label}
    </span>
  );
}

export function FeatureBadge({ feature }: { feature: FeatureKey }) {
  return <StatusBadge status={FEATURES[feature]} />;
}
