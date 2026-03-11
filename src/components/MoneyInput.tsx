import React, { useEffect } from "react";

interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, autoFocus, ...rest }, ref) => {

    useEffect(() => {
      if (autoFocus && ref && "current" in ref && ref.current) {
        ref.current.focus();
        ref.current.click();
      }
    }, [autoFocus]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Убираем всё кроме цифр
      const raw = e.target.value.replace(/\D/g, "");
      // Форматируем с пробелами: 400000 -> 400 000
      const formatted = raw ? Number(raw).toLocaleString("ru-RU") : "";
      onChange(formatted);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        {...rest}
      />
    );
  }
);

MoneyInput.displayName = "MoneyInput";

export default MoneyInput;
