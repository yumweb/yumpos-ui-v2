import { useEffect, useState } from "react";

/** Debounced search + page state for list screens. */
export function useListState(delay = 250) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, delay);
    return () => clearTimeout(t);
  }, [search, delay]);

  return { search, setSearch, debounced, page, setPage };
}
