import { connect } from "../api/src/db/index";
import { Matches } from "../api/src/db/matches";
import { fetchPS } from "../api/src/worker/uploads";

const majorActivity = async () => {
  await connect();

  const allMatches = await Matches.find({
    templateName: "USPSA",
    $expr: {
      $gt: [
        "$created",
        { $dateSubtract: { startDate: "$$NOW", unit: "month", amount: 12 } },
      ],
    },
    // subType: { $in: ["", "uspsa"] },
  })
    .select("uuid")
    .limit(0);

  console.log(allMatches.length);
  const majorMatches = [];
  const shooters = {};

  let i = 0;
  for (const match of allMatches) {
    try {
      const matchDef = await fetchPS(`${match.uuid}/match_def.json`);
      if (!matchDef) {
        continue;
      }
      const { match_shooters, match_level } = matchDef;
      if (!match_shooters) {
        continue;
      }

      const level = Number.parseInt((match_level || "").replace(/\D/g, ""));
      if (level > 1) {
        majorMatches.push(match);

        for (const shooter of match_shooters) {
          shooters[shooter.sh_id] = 1;
        }
      }

      ++i;
      console.log(match.uuid + " " + i + "/" + allMatches.length);
    } catch (e) {}
  }

  console.log("matches: " + allMatches.length);
  console.log("major matches: " + majorMatches.length);
  console.log("unique shooters: " + Object.keys(shooters).length);
};

majorActivity();
