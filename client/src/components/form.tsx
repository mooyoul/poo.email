import * as React from 'react';

export function useTextInput(initial: string = ''): [string, React.ChangeEventHandler] {
  const [value, setValue] = React.useState<string>(initial);

  const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return [value, onChange];
}
