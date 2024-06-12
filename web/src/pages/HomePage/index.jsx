import { Button } from "primereact/button";
import UnderConstruction from "../../components/UnderConstruction";
import { useNavigate } from "react-router-dom";

const PricesBlock = ({ clubAffiliation = 0, membership = 0, classifier = 0 }) => (
  <>
    <hr className="my-3 mx-0 border-top-1 border-bottom-none border-300" />
    <div className="flex align-items-center">
      <span className="font-bold text-2xl text-900">${membership}</span>
      <span className="ml-2 font-medium text-600">Annual Membership Fee</span>
    </div>
    <div className="flex align-items-center">
      <span className="font-bold text-2xl text-900">${clubAffiliation}</span>
      <span className="ml-2 font-medium text-600">Annual Club Affiliation Fee</span>
    </div>
    <div className="flex align-items-center">
      <span className="font-bold text-2xl text-900">${classifier}</span>
      <span className="ml-2 font-medium text-600">Classifier Fee (per shooter)</span>
    </div>
    <hr className="my-3 mx-0 border-top-1 border-bottom-none border-300" />
  </>
);

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="surface-0">
      <div className="text-900 font-bold text-5xl mb-2 text-center">Pricing Plans</div>
      <div className="text-700 text-xl mb-4 text-center line-height-3">
        <b>Track Your Progress</b> and <b>Elevate Your Skills</b> by choosing the{" "}
        <b>Best Classification System</b>
      </div>

      <div className="grid">
        <div className="col-12 lg:col-4">
          <div className="p-1 h-full">
            <div
              className="shadow-2 p-3 h-full flex flex-column"
              style={{ borderRadius: "6px" }}
            >
              <div className="text-900 font-medium text-xl mb-2">HitFactor.Info</div>
              <div className="text-600">Howler Monkey Classifiers</div>
              <PricesBlock />
              <ul className="list-none p-0 m-0 flex-grow-1">
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Accurate HHFs from Statistical Analysis</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Classifiaction Goes Up and Down</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Instant Reclassifiaction</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Discourages Grandbagging</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Full Division & Classifier Leaderboards</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Open-Source</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Search By Partial Number or Name</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Find & Report Suspicious Scores</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Multi-Score "What Ifs"</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Extra Stats & Visualisation Tools</span>
                </li>
              </ul>
              <hr className="mb-3 mx-0 border-top-1 border-bottom-none border-300 mt-auto" />
              <Button
                label="Just Use It"
                className="p-3 w-full mt-auto"
                onClick={() => navigate("/classifiers/co")}
              />
            </div>
          </div>
        </div>

        <div className="col-12 lg:col-4">
          <div className="p-1 h-full">
            <div
              className="shadow-2 p-3 h-full flex flex-column"
              style={{ borderRadius: "6px" }}
            >
              <div className="text-900 font-medium text-xl mb-2">USPSA.org</div>
              <div className="text-600">BOC's Random Numbers Generator</div>
              <PricesBlock membership={65} clubAffiliation={75} classifier={3} />
              <ul className="list-none p-0 m-0 flex-grow-1">
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Jake's bogus, make-beleive HHFs</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Classification Only Goes Up</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Weekly Reclassification</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Encourages Grandbagging (for a fee)</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Top 20 Only</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Closed Source, Zero Transparency</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Search by Exact Number Only</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>No Report System, Zero Accountability</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Calculator & History Only</span>
                </li>
              </ul>
              <hr className="mb-3 mx-0 border-top-1 border-bottom-none border-300" />
              <Button
                label="Maintain BOC's Way of Life"
                className="p-3 w-full p-button-outlined"
                onClick={() => window.open("https://uspsa.org/join", "_blank")}
              />
            </div>
          </div>
        </div>

        <div className="col-12 lg:col-4">
          <div className="p-1 h-full">
            <div
              className="shadow-2 p-3 flex flex-column"
              style={{ borderRadius: "6px" }}
            >
              <div className="text-900 font-medium text-xl mb-2">IDPA.org</div>
              <div className="text-600">At least you're shooting something...</div>
              <PricesBlock membership={45} clubAffiliation={50} />
              <ul className="list-none p-0 m-0 flex-grow-1">
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Simple Timeplus Scoring</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Single Classifier</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Silly WSBs</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Stylish Fishing Vests Always in Fashion</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-check-circle text-green-500 mr-2"></i>
                  <span>Less corrupt than USPSA</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>No Reclassification</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Every Blind Limp Dog is a Master</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Heavy Accuracy Penalties</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Slow Is Smooth and Smooth Is Fast</span>
                </li>
                <li className="flex align-items-center mb-3">
                  <i className="pi pi-times-circle text-red-500 mr-2" />
                  <span>Less Competition</span>
                </li>
              </ul>
              <hr className="mb-3 mx-0 border-top-1 border-bottom-none border-300" />
              <Button
                label="Buy A Fishing Vest"
                className="p-3 w-full p-button-outlined"
                onClick={() => window.open("https://idpa.com/membership", "_blank")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
