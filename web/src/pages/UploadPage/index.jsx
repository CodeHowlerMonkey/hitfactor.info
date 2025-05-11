import { Button } from "primereact/button";
import { SelectButton } from "primereact/selectbutton";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { DivisionNavigation, ScoresChart } from "@web/components";
import MatchBumpChart from "@web/components/chart/MatchBumpChart";
import ShooterMatchScoresTable from "@web/pages/ShootersPage/components/ShooterMatchesTable";
import { useApi } from "@web/utils/client";
import useSearchParamState from "@web/utils/useSearchParamState";

import SearchUploads from "./SearchUploads";

const getOrdinalSuffix = n => {
  const rem10 = n % 10;
  const rem100 = n % 100;
  return rem100 >= 11 && rem100 <= 13
    ? "th"
    : rem10 === 1
      ? "st"
      : rem10 === 2
        ? "nd"
        : rem10 === 3
          ? "rd"
          : "th";
};

const formatOrdinal = n => `${n}${getOrdinalSuffix(n)}`;

const MatchPage = ({ uuid }) => {
  const { json: match, loading } = useApi(`/upload/${uuid}`);
  const [q] = useSearchParamState("q", "");
  const navigate = useNavigate();
  const { division } = useParams();
  const onDivisionSelect = useCallback(
    newDivision => {
      navigate(`/upload/${uuid}/${newDivision || ""}?q=${q}`);
    },
    [navigate, uuid, q],
  );

  const [scoresMode, setScoresMode] = useState("Linear Regression");

  return (
    <div>
      <div className="p-0 md:px-4">
        <div className="flex flex-column flex align-items-center mt-2">
          <div className="flex flex-column" style={{ width: "min(90rem, 90vw)" }}>
            <div className="flex justify-content-between">
              <Button
                className="text-sm md:text-lg lg:text-xl font-bold px-0 md:px-2"
                icon="pi pi-chevron-left"
                rounded
                text
                aria-label="Back"
                onClick={() => navigate(`/upload?q=${q}`)}
              >
                Uploads
              </Button>
              <h2 className="mx-auto md:text-xl lg:text-xxl w-max">{match?.name}</h2>
            </div>
            <DivisionNavigation onSelect={onDivisionSelect} />
            {division && (
              <>
                <div className="flex justify-content-between align-items-center my-3">
                  <div className="m-auto">
                    <SelectButton
                      size="small"
                      className="compact text-xs"
                      allowEmpty={false}
                      options={["Linear Regression", "Weibull"]}
                      value={scoresMode}
                      onChange={e => setScoresMode(e.value)}
                    />
                  </div>
                </div>
                {scoresMode !== "Linear Regression" ? null : (
                  <div style={{ background: "#1c1d2652" }}>
                    <MatchBumpChart match={match} division={division} loading={loading} />
                  </div>
                )}
                {scoresMode !== "Weibull" ? null : (
                  <div
                    className="w-full bg-primary-reverse"
                    style={{
                      maxWidth: "100%",
                      height: "calc(min(80vh, max(60vh, 60vw)))",
                    }}
                  >
                    <ScoresChart
                      showWeibull
                      hideExpandButton
                      label="CDF"
                      division={division}
                      classifier="Match"
                      hhf={100}
                      recHHF={0}
                      totalScores={0}
                      pointLabelCallback={({
                        raw: {
                          place,
                          memberNumber,
                          shooterFullName,
                          matchPercent,
                          shooterRecPercentHistorical,
                          pointsGraphName,
                        },
                      }) =>
                        pointsGraphName
                          ? null
                          : `${formatOrdinal(place)} — ${matchPercent}% — ${memberNumber} — ${shooterFullName} (${shooterRecPercentHistorical?.toFixed(2) || "0"}%) `
                      }
                      urlFactory={() =>
                        `/upload/matchScores?division=${division}&match=${uuid}`
                      }
                      dataTransform={matches =>
                        (matches || [])
                          .toSorted((a, b) => b.matchPercent - a.matchPercent)
                          .map((c, index, all) => {
                            const dateUnix = new Date(c.date).getTime();
                            const percentile = (100 * index) / all.length;

                            return {
                              ...c,
                              x: c.matchPercent,
                              y: index + 1,
                              elo: 0,
                              recPercentUncapped: c.shooterRecPercentHistorical,
                              hf: c.matchPercent,
                              place: index + 1,
                              percentile,
                              dateUnix,
                              date: dateUnix,
                            };
                          })
                      }
                    />
                  </div>
                )}
                <ShooterMatchScoresTable match={uuid} division={division} mode="match" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const UploadPage = () => {
  const { uuid } = useParams();
  if (!uuid) {
    return <SearchUploads />;
  }

  return <MatchPage uuid={uuid} />;
};

export default UploadPage;
