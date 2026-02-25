import React from "react";

interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/,/g, ".");
          const cleaned = raw.replace(/[^0-9.]/g, "");
          const normalized = cleaned.replace(/(\..*)\./g, "$1");
          onChange(normalized);
        }}
        {...rest}
      />
    );
  }
);

MoneyInput.displayName = "MoneyInput";

export default MoneyInput;
