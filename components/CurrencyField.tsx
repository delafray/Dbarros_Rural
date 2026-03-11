import React, { useState } from "react";

interface CurrencyFieldProps {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  placeholder?: string;
}

const CurrencyField: React.FC<CurrencyFieldProps> = ({
  value,
  onChange,
  className,
  placeholder,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const formatted =
    value != null
      ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "";

  return (
    <input
      type="text"
      inputMode="numeric"
      value={editing ? draft : formatted}
      placeholder={placeholder ?? "—"}
      onFocus={(e) => {
        setEditing(true);
        setDraft(value != null && value !== 0 ? String(value) : "");
        setTimeout(() => e.target.select(), 0);
      }}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9,]/g, ""))}
      onBlur={() => {
        setEditing(false);
        const raw = draft.replace(",", ".");
        const parsed = parseFloat(raw);
        onChange(isNaN(parsed) ? null : parsed);
      }}
      className={className}
    />
  );
};

export default CurrencyField;
