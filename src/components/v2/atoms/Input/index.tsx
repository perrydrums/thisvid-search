import React from 'react';

import styles from './Input.module.css';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  inputSize?: 'medium' | 'large';
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', inputSize = 'medium', ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={[styles.input, styles[inputSize], className].filter(Boolean).join(' ')}
        {...rest}
      />
    );
  },
);

Input.displayName = 'Input';
