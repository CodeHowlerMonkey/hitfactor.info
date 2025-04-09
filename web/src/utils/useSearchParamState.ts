import { useSearchParams } from "react-router-dom";

const useSearchParamState = (
  key: string,
  defaultValue?: string,
): [string | undefined, (value: string) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentValue = searchParams.get(key);
  const value = currentValue ?? defaultValue;

  const setValue = (newValue: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (!newValue) {
      newParams.delete(key);
    } else {
      newParams.set(key, newValue);
    }
    setSearchParams(newParams);
  };

  return [value, setValue];
};

export default useSearchParamState;
