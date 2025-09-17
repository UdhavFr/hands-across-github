/**
 * Form Validation Hook
 * 
 * Provides real-time validation feedback with debouncing,
 * form auto-save functionality, and comprehensive validation rules.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { ErrorService } from '../services/errorService';

export type ValidationRule<T = any> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
  asyncValidator?: (value: T) => Promise<string | null>;
};

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom' | 'async';
}

export interface FormValidationState<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isValidating: boolean;
  isDirty: boolean;
}

export interface UseFormValidationOptions<T> {
  initialValues: T;
  validationRules: ValidationRules<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
  enableAutoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSave?: (values: T) => Promise<void>;
  onValidationChange?: (isValid: boolean, errors: Record<keyof T, string>) => void;
}

/**
 * Hook for comprehensive form validation with real-time feedback
 */
export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
  enableAutoSave = false,
  autoSaveDelay = 2000,
  onAutoSave,
  onValidationChange,
}: UseFormValidationOptions<T>) {
  const [state, setState] = useState<FormValidationState<T>>({
    values: initialValues,
    errors: {} as Record<keyof T, string>,
    touched: {} as Record<keyof T, boolean>,
    isValid: false,
    isValidating: false,
    isDirty: false,
  });

  const validationTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const initialValuesRef = useRef(initialValues);

  /**
   * Validates a single field
   */
  const validateField = useCallback(async (
    field: keyof T,
    value: T[keyof T],
    showError = true
  ): Promise<string | null> => {
    const rules = validationRules[field];
    if (!rules) return null;

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return 'This field is required';
    }

    // Skip other validations if field is empty and not required
    if (!value && !rules.required) return null;

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        return `Must be at least ${rules.minLength} characters`;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        return `Must be no more than ${rules.maxLength} characters`;
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        return 'Invalid format';
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) return customError;
    }

    // Async validation
    if (rules.asyncValidator) {
      try {
        setState(prev => ({ ...prev, isValidating: true }));
        const asyncError = await rules.asyncValidator!(value);
        if (asyncError) return asyncError;
      } catch (error) {
        ErrorService.logError(
          error instanceof Error ? error : new Error(String(error)),
          'useFormValidation.validateField',
          { field: String(field), value }
        );
        return 'Validation failed';
      } finally {
        setState(prev => ({ ...prev, isValidating: false }));
      }
    }

    return null;
  }, [validationRules]);

  /**
   * Validates all fields
   */
  const validateAllFields = useCallback(async (): Promise<boolean> => {
    const errors: Record<keyof T, string> = {} as Record<keyof T, string>;
    let hasErrors = false;

    setState(prev => ({ ...prev, isValidating: true }));

    try {
      for (const [field, value] of Object.entries(state.values)) {
        const error = await validateField(field as keyof T, value);
        if (error) {
          errors[field as keyof T] = error;
          hasErrors = true;
        }
      }

      setState(prev => ({
        ...prev,
        errors,
        isValid: !hasErrors,
        isValidating: false,
      }));

      onValidationChange?.(!hasErrors, errors);
      return !hasErrors;
    } catch (error) {
      setState(prev => ({ ...prev, isValidating: false }));
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'useFormValidation.validateAllFields'
      );
      return false;
    }
  }, [state.values, validateField, onValidationChange]);

  /**
   * Debounced field validation
   */
  const debouncedValidateField = useDebounce(
    async (field: keyof T, value: T[keyof T]) => {
      const error = await validateField(field, value);
      
      setState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: error || '',
        },
      }));
    },
    debounceMs
  );

  /**
   * Updates a field value
   */
  const setValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setState(prev => {
      const newValues = { ...prev.values, [field]: value };
      const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValuesRef.current);
      
      return {
        ...prev,
        values: newValues,
        isDirty,
        touched: { ...prev.touched, [field]: true },
      };
    });

    // Validate on change if enabled
    if (validateOnChange) {
      // Clear existing timeout for this field
      if (validationTimeoutRef.current[String(field)]) {
        clearTimeout(validationTimeoutRef.current[String(field)]);
      }
      
      debouncedValidateField(field, value);
    }

    // Auto-save if enabled
    if (enableAutoSave && onAutoSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        const currentValues = { ...state.values, [field]: value };
        onAutoSave(currentValues).catch(error => {
          ErrorService.logError(
            error instanceof Error ? error : new Error(String(error)),
            'useFormValidation.autoSave'
          );
        });
      }, autoSaveDelay);
    }
  }, [validateOnChange, debouncedValidateField, enableAutoSave, onAutoSave, autoSaveDelay, state.values]);

  /**
   * Updates multiple field values
   */
  const setValues = useCallback((newValues: Partial<T>) => {
    setState(prev => {
      const updatedValues = { ...prev.values, ...newValues };
      const isDirty = JSON.stringify(updatedValues) !== JSON.stringify(initialValuesRef.current);
      
      const newTouched = { ...prev.touched };
      Object.keys(newValues).forEach(key => {
        newTouched[key as keyof T] = true;
      });
      
      return {
        ...prev,
        values: updatedValues,
        touched: newTouched,
        isDirty,
      };
    });

    // Validate changed fields if enabled
    if (validateOnChange) {
      Object.entries(newValues).forEach(([field, value]) => {
        debouncedValidateField(field as keyof T, value);
      });
    }
  }, [validateOnChange, debouncedValidateField]);

  /**
   * Handles field blur events
   */
  const handleBlur = useCallback(async (field: keyof T) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [field]: true },
    }));

    if (validateOnBlur) {
      const error = await validateField(field, state.values[field]);
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: error || '' },
      }));
    }
  }, [validateOnBlur, validateField, state.values]);

  /**
   * Resets form to initial values
   */
  const reset = useCallback(() => {
    setState({
      values: initialValues,
      errors: {} as Record<keyof T, string>,
      touched: {} as Record<keyof T, boolean>,
      isValid: false,
      isValidating: false,
      isDirty: false,
    });

    // Clear timeouts
    Object.values(validationTimeoutRef.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    validationTimeoutRef.current = {};

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
  }, [initialValues]);

  /**
   * Gets field props for easy integration with form inputs
   */
  const getFieldProps = useCallback((field: keyof T) => {
    return {
      value: state.values[field] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setValue(field, e.target.value as T[keyof T]);
      },
      onBlur: () => handleBlur(field),
      error: state.touched[field] ? state.errors[field] : '',
      hasError: state.touched[field] && !!state.errors[field],
    };
  }, [state, setValue, handleBlur]);

  /**
   * Gets validation status for a field
   */
  const getFieldStatus = useCallback((field: keyof T) => {
    const hasError = state.touched[field] && !!state.errors[field];
    const isValid = state.touched[field] && !state.errors[field] && state.values[field];
    
    return {
      hasError,
      isValid,
      error: hasError ? state.errors[field] : null,
      touched: state.touched[field] || false,
    };
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(validationTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Field operations
    setValue,
    setValues,
    handleBlur,
    
    // Validation
    validateField,
    validateAllFields,
    
    // Utilities
    reset,
    getFieldProps,
    getFieldStatus,
    
    // Computed values
    hasErrors: Object.values(state.errors).some(error => !!error),
    touchedFields: Object.keys(state.touched).filter(key => state.touched[key as keyof T]),
    dirtyFields: Object.keys(state.values).filter(key => 
      state.values[key as keyof T] !== initialValuesRef.current[key as keyof T]
    ),
  };
}