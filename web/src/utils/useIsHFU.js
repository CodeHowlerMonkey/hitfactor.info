import { useParams } from "react-router-dom";

import { sportForDivision } from "../../../shared/constants/divisions";

export const useIsHFU = division => {
  const { division: divisionParam } = useParams();
  return sportForDivision(division ?? divisionParam) === "hfu";
};
