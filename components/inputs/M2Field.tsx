import React from "react";

interface M2FieldProps {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onEnter?: () => void;
}

const M2Field: React.FC<M2FieldProps> = ({ value, onChange, className, inputRef, onEnter }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={editing ? draft : (value != null ? String(value) : "")}
      placeholder="—"
      onFocus={(e) => {
        setEditing(true);
        setDraft(value != null ? String(value) : "");
        setTimeout(() => e.target.select(), 0);
      }}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ""))}
      onBlur={() => {
        setEditing(false);
        const parsed = parseFloat(draft);
        onChange(isNaN(parsed) ? null : parsed);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          // Commit valor antes de pular
          setEditing(false);
          const parsed = parseFloat(draft);
          onChange(isNaN(parsed) ? null : parsed);
          onEnter?.();
        }
      }}
      className={className}
    />
  );
};

export default M2Field;
