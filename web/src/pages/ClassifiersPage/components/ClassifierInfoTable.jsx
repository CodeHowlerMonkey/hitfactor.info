import { ScoresChart } from "../../../components/chart/ScoresChart";

export const ClassifierInfoTable = ({
  division,
  classifier,
  hhf,
  recHHF,
  recommendedHHF1,
  recommendedHHF5,
  recommendedHHF15,
}) => (
  <div className="flex flex-wrap gap-2 justify-content-around">
    <div
      className="flex-grow-1 flex flex-column"
      style={{ minWidth: "20em", height: "42em" }}
    >
      <h4 className="md:text-lg">Scores Distribution</h4>
      <div className="h-full w-auto flex-grow-1 bg-primary-reverse">
        <ScoresChart
          division={division}
          classifier={classifier}
          hhf={hhf}
          recHHF={recHHF}
          recommendedHHF1={recommendedHHF1}
          recommendedHHF5={recommendedHHF5}
          recommendedHHF15={recommendedHHF15}
        />
      </div>
    </div>
  </div>
);

export default ClassifierInfoTable;
