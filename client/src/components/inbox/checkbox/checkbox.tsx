import * as React from 'react';

export type InboxCheckboxProps = {
  checked?: boolean;
  indeterminate?: boolean;
  onChange(e: React.ChangeEvent<HTMLInputElement>): void;
};

export function InboxCheckbox(props: InboxCheckboxProps) {
  const { checked, indeterminate, onChange } = props;

  const ref = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;

    if (el && indeterminate) {
      el.indeterminate = true;
      el.checked = true;
    }
  });

  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label className="inbox-checkbox">
      <span className="is-sr-only">Select Mail</span>
      <input type="checkbox" ref={ref} checked={checked} onChange={onChange} />
      <span className="checkbox-icon" />
    </label>
  );
}
