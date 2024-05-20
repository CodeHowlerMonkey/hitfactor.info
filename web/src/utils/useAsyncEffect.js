import { useEffect } from "react";

// fuck dan abramov
const useAsyncEffect = (asyncFn, deps) => {
  useEffect(() => {
    asyncFn();
  }, deps);
};

export default useAsyncEffect;
