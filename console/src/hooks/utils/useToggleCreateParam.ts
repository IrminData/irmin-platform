import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Hook that returns a function to toggle
 * the `?create` query parameter on the current URL.
 */
export function useToggleCreateParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Adds `?create` if missing, or removes it if present.
   */
  const toggleCreateParam = () => {
    // clone existing search params
    const params = new URLSearchParams(searchParams.toString());

    if (params.has('create')) {
      // remove the `create` flag
      params.delete('create');
    } else {
      // add the `create` flag with an empty value
      params.set('create', '');
    }

    // rebuild url: omit '?' if no params remain
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // replace URL
    router.replace(newUrl);
  };

  /**
   * Sets the `create` query parameter to a specific value.
   * If `value` is true, it adds `?create`.
   * If `value` is false, it removes `?create`.
   */
  const setCreateParam = (value: boolean) => {
    // clone existing search params
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      // add the `create` flag with an empty value
      params.set('create', '');
    } else {
      // remove the `create` flag
      params.delete('create');
    }

    // rebuild url: omit '?' if no params remain
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // replace URL
    router.replace(newUrl);
  };

  return { toggleCreateParam, setCreateParam };
}
