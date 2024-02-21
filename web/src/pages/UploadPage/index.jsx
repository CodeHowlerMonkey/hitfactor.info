import UnderConstruction from "../../components/UnderConstruction";

const UploadPage = () => (
  <UnderConstruction>
    This is first page where uploads of a single match will take place.
    <br />
    (Later maybe we can do club uploads from clubs page) One of the most
    important features of this project is complete transparency, <br />
    which database will decrease (unless you have ideas how to make an
    open-source database) <br />
    <br></br>
    So upload actually will be just a transformation / download from
    practiscore,
    <br />
    which then can be commited into this repo. <br />
    <br />
    When server starts up it can look into folder with uploads and load them all
    up. <br />
    I don't think we have so much data that it will actually be impossible to
    run it that way <br />
    anytime soon. Form time to time upload directory can be cleaned up and
    scores commited into more persistent / easier to load <br />
    file format.
    <br />
    Here's how this can be implemented:
    <div style={{ padding: "0 2rem", backgroundColor: "rgba(55,55,55,0.15)" }}>
      looks like we can just operate off a practiscore link:
      https://practiscore.com/results/new/UUID
      <br />
      and then request 2 json files from S3 bucket:
      <br />
      1. https://s3.amazonaws.com/ps-scores/production/UUID/results.json
      <br />
      2. https://s3.amazonaws.com/ps-scores/production/UUID/match_def.json
      <br />
      <br />
      match_def has info about the shooter, which will allow linking shooter
      results to their USPSA number
      <br />
      it also marks which stage is a classifier and what is the code/number
      <br />
      then we can just filter through results and get data we need
      <br />
    </div>
  </UnderConstruction>
);

export default UploadPage;
