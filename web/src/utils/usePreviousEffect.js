import { useEffect, useRef } from "react";

const usePreviousEffect = (fn, inputs = []) => {
  const previousInputsRef = useRef([...inputs]);

  useEffect(() => {
    fn(previousInputsRef.current);
    previousInputsRef.current = [...inputs];
  }, inputs); // eslint-disable-line react-hooks/exhaustive-deps
};

export default usePreviousEffect;
