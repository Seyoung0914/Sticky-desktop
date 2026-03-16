import { useEffect, useRef, useCallback } from 'react';

export function useDebounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): T {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedFn = useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => fn(...args), delay);
        },
        [fn, delay]
    ) as T;

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return debouncedFn;
}
