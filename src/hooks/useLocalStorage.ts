import { Dispatch, SetStateAction, useCallback, useState } from "react";

// Lit une valeur depuis localStorage en fallbackant proprement.
const readLocalStorageValue = <T,>(key: string, initialValue: T): T => {
  if (typeof window === "undefined") {
    return initialValue;
  }

  try {
    const storedItem = window.localStorage.getItem(key);
    return storedItem ? (JSON.parse(storedItem) as T) : initialValue;
  } catch {
    return initialValue;
  }
};

// Hook générique persistant basé sur localStorage.
export const useLocalStorage = <T,>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] => {
  // État local initialisé depuis localStorage.
  const [storedValue, setStoredValue] = useState<T>(() =>
    readLocalStorageValue(key, initialValue)
  );

  // Setter compatible useState qui écrit aussi dans localStorage.
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      setStoredValue((previousValue) => {
        const valueToStore =
          value instanceof Function ? value(previousValue) : value;

        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }
        } catch {
          // Erreur ignorée silencieusement conformément à la contrainte.
        }

        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue];
};
