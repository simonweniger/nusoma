import * as React from 'react';

import { Button, type ButtonProps } from '@workspace/ui/components/button';
import { Spinner } from '@workspace/ui/components/spinner';

export type NextButtonProps = ButtonProps & {
  isLastStep: boolean;
  loading?: boolean;
};

export function NextButton({
  isLastStep,
  loading,
  ...rest
}: NextButtonProps): React.JSX.Element {
  return (
    <div>
      <Button
        variant="default"
        className="mt-4"
        {...rest}
      >
        {loading && <Spinner />}
        {loading ? 'Loading...' : isLastStep ? 'Finish' : 'Next step →'}
      </Button>
    </div>
  );
}
