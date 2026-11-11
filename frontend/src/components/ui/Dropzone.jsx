import { useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { formatBytes } from '../../lib/format.js';

const DEFAULT_MAX = 10 * 1024 * 1024; // matches the backend MAX_UPLOAD_BYTES default

/**
 * Dropzone — drag-and-drop (or click) PDF picker with client-side validation.
 * It only selects/validates a file; the caller performs the upload.
 *
 * Props:
 *   file      — current File or null
 *   onChange  — (File|null) => void
 *   disabled  — disables interaction
 *   hint      — small helper text under the label
 */
export default function Dropzone({ file, onChange, disabled = false, maxSize = DEFAULT_MAX, hint }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  function validate(f) {
    if (!f) return '';
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) return 'Only PDF files are accepted.';
    if (maxSize && f.size > maxSize) return `File is too large — maximum size is ${formatBytes(maxSize)}.`;
    return '';
  }

  function accept(f) {
    const err = validate(f);
    setError(err);
    onChange(err ? null : f);
  }

  function onInput(e) {
    accept(e.target.files?.[0] || null);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    accept(e.dataTransfer.files?.[0] || null);
  }

  function clear() {
    setError('');
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      {file ? (
        <div className="file-chip">
          <span className="file-icon">
            <FileText size={18} strokeWidth={2.1} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="truncate" style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
              {file.name}
            </div>
            <div className="muted tiny">{formatBytes(file.size)} · PDF</div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={clear}
            disabled={disabled}
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`dropzone ${dragging ? 'drag' : ''}`.trim()}
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={disabled}
          aria-label="Upload a PDF diploma"
        >
          <span className="dz-icon">
            <UploadCloud size={24} strokeWidth={2} />
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>Drag &amp; drop your PDF here</div>
            <div className="muted tiny">or click to browse — PDF only, up to {formatBytes(maxSize)}</div>
          </div>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={onInput} disabled={disabled} />
        </button>
      )}

      {error ? (
        <div className="error-text" role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="hint">{hint}</div>
      ) : null}
    </div>
  );
}
