import { Fragment } from 'react';
import { Check } from 'lucide-react';

/**
 * Stepper — horizontal progress indicator for multi-step flows.
 * steps: [{ key, label }]; current is the zero-based index.
 */
export default function Stepper({ steps, current }) {
  return (
    <div className="stepper-h" role="list">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : '';
        return (
          <Fragment key={s.key || i}>
            {i > 0 ? <span className="step-sep" aria-hidden="true" /> : null}
            <div
              className={`step-chip ${state}`.trim()}
              role="listitem"
              aria-current={i === current ? 'step' : undefined}
            >
              <span className="num">{i < current ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
              {s.label}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
