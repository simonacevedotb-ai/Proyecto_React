import { useState, useCallback } from "react";

/**
 * Hook reutilizable para formularios con validación en tiempo real.
 *
 * @param {Object} initialValues - valores iniciales del formulario
 * @param {Object} validators - { campo: (valor, allValues) => "" | "mensaje de error" }
 */
export function useForm(initialValues, validators = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback(
    (name, value, allValues) => {
      const validator = validators[name];
      if (!validator) return "";
      return validator(value, allValues) || "";
    },
    [validators]
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    const newValues = { ...values, [name]: newValue };
    setValues(newValues);

    // Validación en tiempo real mientras el usuario escribe
    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, newValue, newValues),
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value, values),
    }));
  };

  const validateAll = () => {
    const newErrors = {};
    const newTouched = {};
    let isValid = true;

    Object.keys(validators).forEach((name) => {
      const error = validateField(name, values[name], values);
      newErrors[name] = error;
      newTouched[name] = true;
      if (error) isValid = false;
    });

    setErrors(newErrors);
    setTouched(newTouched);
    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValues,
    setErrors,
  };
}
