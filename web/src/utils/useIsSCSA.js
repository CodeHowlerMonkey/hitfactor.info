import { useParams } from "react-router-dom";

export const useIsSCSA = () => {
  const { division: divisionParam } = useParams();
  return divisionParam.startsWith("scsa");
};
