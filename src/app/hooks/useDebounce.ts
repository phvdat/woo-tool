import { useState, useEffect } from 'react';

/**
 * Hook trì hoãn giá trị đầu vào.
 * @param value Giá trị cần debounce
 * @param delay Thời gian trễ (ms), mặc định là 500ms
 * @returns Giá trị đã được debounce
 */
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
