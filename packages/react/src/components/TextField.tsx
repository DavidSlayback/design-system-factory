import { useId, type InputHTMLAttributes } from "react";
import { dsfClasses } from "../classes";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label, always rendered and associated with the input. */
  label: string;
  /**
   * Validation message. When set, the input is marked invalid
   * (aria-invalid) and the message is linked via aria-describedby.
   */
  error?: string;
}

export function TextField({ label, error, id: idProp, className, ...rest }: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;

  return (
    <div className={dsfClasses("dsf-text-field", className)}>
      <label className="dsf-text-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...rest}
        id={id}
        className="dsf-text-field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <div className="dsf-text-field__error" id={errorId} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}
