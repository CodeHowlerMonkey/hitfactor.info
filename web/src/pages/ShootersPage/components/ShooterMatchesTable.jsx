import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import qs from "qs";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import ShooterCell from "../../../components/ShooterCell";
import {
  headerTooltipOptions,
  renderMatchLevel,
  renderPercent,
} from "../../../components/Table";
import useApiQuery from "../../../query/useApiQuery";

const ShooterMatchScoresTable = ({
  memberNumber,
  division,
  match,
  hidden,
  nerdMode,
  mode, // "match" | "shooter"
}) => {
  const { json: matches, loading } = useApiQuery(
    `/upload/matchScores?${qs.stringify({ memberNumber, division, match })}`,
  );
  const navigate = useNavigate();

  // match
  const hideAnalysisButton = mode === "match";
  const hideMatchName = mode === "match";
  const hideDate = mode === "match";

  // shooter
  const hideShooterName = mode === "shooter";

  const matchScores = useMemo(() => {
    if (loading) {
      return [];
    }

    return (matches || [])
      .toSorted((a, b) => b.matchPercent - a.matchPercent)
      .map((c, index, all) => ({
        ...c,
        place: index + 1,
        percentile: (100 * index) / all.length,
        dateUnix: new Date(c.date).getTime(),
      }))
      .filter(c => mode === "match" || c.level >= 2);
  }, [matches, loading, mode]);

  if (hidden) {
    return null;
  }

  return (
    <DataTable
      scrollHeight="80vh"
      scrollable
      className="text-xs md:text-base"
      sortOrder={-1}
      sortField={hideDate ? "matchPercent" : "dateUnix"}
      loading={loading}
      stripedRows
      value={matchScores}
      tableStyle={{ minWidth: "50rem" }}
    >
      <Column
        hidden={!hideDate}
        field="place"
        header="#"
        align="center"
        style={{ maxWidth: "4em" }}
      />
      <Column
        hidden={!hideDate}
        field="percentile"
        header="Perc."
        headerTooltip="Percentile for this score. Shows how many percent of scores are higher than this one."
        headerTooltipOptions={headerTooltipOptions}
        body={c => `${c.percentile.toFixed(2)}%`}
      />
      <Column
        hidden={hideDate}
        field="dateUnix"
        header="Date"
        sortable
        style={{ width: "7em" }}
        body={run => new Date(run.date).toLocaleDateString("en-us", { timeZone: "UTC" })}
      />
      <Column
        hidden={hideDate}
        sortable
        field="level"
        header="Level"
        align="center"
        body={renderMatchLevel}
      />
      <Column
        hidden={hideShooterName}
        field="shooterFullName"
        header="Shooter"
        style={{ minWidth: "18em" }}
        body={c => (
          <ShooterCell
            data={{ ...c.shooter, shooterFullName: c.shooterFullName }}
            sport="uspsa"
            onClick={() => navigate(`/shooters/${division}/${c.memberNumber}`)}
          />
        )}
        body2={c => (
          <Link to={`/shooters/${division}/${c.memberNumber}`}>{c.shooterFullName}</Link>
        )}
      />
      <Column
        hidden={hideMatchName}
        field="match.name"
        header="Match Name"
        style={{ minWidth: "18em" }}
        body={c => (
          <a
            href={`https://practiscore.com/results/new/${c.upload}`}
            target="_blank"
            style={{
              color: "unset",
              textUnderlineOffset: "0.2em",
              textDecorationColor: "rgba(255,255,255,0.5)",
            }}
            rel="noreferrer"
          >
            {c.match.name}
          </a>
        )}
      />
      <Column
        body={renderPercent}
        field="matchPercent"
        header="Result"
        sortable
        headerTooltip="Match Division Result in Percent"
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        body={renderPercent}
        field="shooterRecPercentHistorical"
        header="Classification"
        sortable
        headerTooltip="Classification Percentage at the Time of the Match"
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        // I done fucked up and allowed zeros to creep in, needs re-backfill
        hidden
        /*hidden={!nerdMode}*/
        style={{ minWidth: "9em" }}
        align="right"
        body={renderPercent}
        field="minClassification"
        header="Min. Classification"
        sortable
        headerTooltip="Lowest Historical Classification present in this match"
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        hidden={!nerdMode}
        style={{ minWidth: "9em" }}
        align="right"
        body={renderPercent}
        field="maxClassification"
        header="Max. Classification"
        sortable
        headerTooltip="Highest Historical Classification present in this match"
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        body={(c, meta) => {
          const value = renderPercent(c, meta);
          return (
            <span
              className={
                c.matchBump?.eligible
                  ? "text-green-600"
                  : c.matchBump?.maybeEligible
                    ? "text-yellow-600"
                    : "text-red-600"
              }
            >
              {value}
            </span>
          );
        }}
        field="bump"
        header="Bump"
        sortable
        headerTooltip="What percentage this match could count as for classification purposes, if eligible (green color indicates eligibility)."
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        hidden={!nerdMode}
        style={{ minWidth: "9em" }}
        align="right"
        body={renderPercent}
        field="minBump"
        header="Min. Bump"
        sortable
        headerTooltip="Lowest Bump value, that can be produced by this match, if eligible"
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        hidden={!nerdMode}
        style={{ minWidth: "9em" }}
        align="right"
        body={renderPercent}
        field="maxBump"
        header="Max. Bump"
        sortable
        headerTooltip="Highest Bump value, that can be produced by this match, if eligible"
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        hidden={!nerdMode}
        style={{ width: "9em" }}
        field="filteredDataPoints"
        header="Data Points"
        sortable
        headerTooltip="Number of Data Points (Filtered)"
        headerTooltipOptions={headerTooltipOptions}
      />
      <Column
        hidden={!nerdMode}
        style={{ width: "8em", minWidth: "7em" }}
        field="filteredMasters"
        header="Ms"
        sortable
        headerTooltip="Number of Masters (Filtered / Un-Filtered)"
        headerTooltipOptions={headerTooltipOptions}
        body={c => `${c.filteredMasters} / ${c.masters}`}
      />
      <Column
        hidden={!nerdMode}
        style={{ minWidth: "7em" }}
        field="filteredGrandmasters"
        header="GMs"
        sortable
        headerTooltip="Number of Grandmasters (Filtered / Un-Filtered)"
        headerTooltipOptions={headerTooltipOptions}
        body={c => `${c.filteredGrandmasters} / ${c.grandmasters}`}
      />
      <Column
        hidden={!nerdMode}
        field="filteredCorrelation"
        header="Correlation"
        sortable
        headerTooltip="Correlation between filtered Match Finishes & Classification (filtered)"
        headerTooltipOptions={headerTooltipOptions}
        body={(c, meta) => renderPercent(c, meta, n => n * 100)}
      />
      <Column
        hidden={!nerdMode}
        field="slope"
        header="m"
        sortable
        headerTooltip="Slope (Linear Regression, Filtered Datapoints)"
        headerTooltipOptions={headerTooltipOptions}
        body={c => c.slope?.toFixed(2)}
      />
      <Column
        hidden={!nerdMode}
        field="intercept"
        header="b"
        sortable
        headerTooltip="Intercept (Linear Regression, Filtered Datapoints)"
        headerTooltipOptions={headerTooltipOptions}
        body={c => c.intercept?.toFixed(2)}
      />
      <Column
        hidden={!nerdMode}
        field="mae"
        header="MAE"
        sortable
        headerTooltip="Mean Absolute Error (Linear Regression, Filtered Datapoints)"
        headerTooltipOptions={headerTooltipOptions}
        body={renderPercent}
      />
      <Column
        hidden={hideAnalysisButton}
        field="analysis"
        header="Analysis"
        align="center"
        style={{ verticalAlign: "center" }}
        body={c => (
          <Link to={`/upload/${c.upload}`}>
            <i className="pi pi-external-link" />
          </Link>
        )}
      />
    </DataTable>
  );
};

export default ShooterMatchScoresTable;
