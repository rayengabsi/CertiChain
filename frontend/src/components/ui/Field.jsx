/**
 * Field — accessible form field wrapper (label + control + hint/error).
 * Pass the input as children; wire htmlFor/id for a real label association.
 */
export default function Field({ label, htmlFor, required, hint, error, children }) {
  return (
    <div className="field">
      {label ? (
        <label htmlFor={htmlFor}>
          {label}
          {required ? <span className="req" aria-hidden="true">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <div className="error-text" role="alert">{error}</div>
      ) : hint ? (
        <div className="hint">{hint}</div>
      ) : null}
    </div>
  );
}
