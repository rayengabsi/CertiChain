/**
 * Tabs — accessible, controlled tab strip.
 * tabs: [{ value, label, icon? }]
 */
export default function Tabs({ tabs, value, onChange, ariaLabel }) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            className="tab"
            aria-selected={value === t.value}
            onClick={() => onChange(t.value)}
          >
            {Icon ? <Icon size={15} strokeWidth={2.2} /> : null}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
