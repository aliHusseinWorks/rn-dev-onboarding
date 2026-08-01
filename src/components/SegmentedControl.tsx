interface Props {
  // Groups the radios, so two controls in one modal don't steal each other's
  // arrow-key navigation.
  name: string
  // id of the visible caption above the control. Pointing at it beats repeating
  // it in an `aria-label`, which leaves the same words maintained in two places.
  labelledBy: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

// Radios rather than buttons: arrow-key navigation, tab order and the
// announced group name all come from the browser, so there is no keyboard
// handling to get wrong.
export function SegmentedControl({ name, labelledBy, value, options, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg has-[:checked]:bg-surface has-[:checked]:text-fg has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
