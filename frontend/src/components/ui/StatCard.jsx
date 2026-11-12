/**
 * StatCard — KPI tile for dashboards.
 * tone: '' (accent) | 'ok' | 'warn' | 'bad' | 'blue'
 */
export default function StatCard({ label, value, icon: Icon, tone = '', foot }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon ? (
          <span className={`stat-icon ${tone}`.trim()}>
            <Icon size={18} strokeWidth={2.1} />
          </span>
        ) : null}
      </div>
      <div className="stat-value">{value}</div>
      {foot ? <div className="stat-foot">{foot}</div> : null}
    </div>
  );
}
