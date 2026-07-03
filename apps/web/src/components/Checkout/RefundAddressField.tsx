'use client';

interface RefundAddressFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  warning?: string;
  /** callout = bordered emphasis box; inline = plain text */
  warningVariant?: 'callout' | 'inline';
  testId?: string;
}

export function RefundAddressField({
  value,
  onChange,
  label,
  placeholder,
  warning,
  warningVariant = 'callout',
  testId = 'checkout-refund-wallet',
}: RefundAddressFieldProps) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={placeholder}
          autoComplete="off"
          data-testid={testId}
        />
      </label>
      {warning &&
        (warningVariant === 'inline' ? (
          <p className="text-xs text-warning">{warning}</p>
        ) : (
          <p className="rounded-lg border border-warning/20 bg-warning/8 px-3 py-2 text-xs text-warning">
            {warning}
          </p>
        ))}
    </div>
  );
}
