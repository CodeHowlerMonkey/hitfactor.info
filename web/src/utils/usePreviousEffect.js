import { useEffect, useRef } from "react";

const usePreviousEffect = (fn, inputs = []) => {
  const previousInputsRef = useRef([...inputs]);

  useEffect(() => {
    fn(previousInputsRef.current);
    previousInputsRef.current = [...inputs];
  }, inputs);
};

export default usePreviousEffect;
