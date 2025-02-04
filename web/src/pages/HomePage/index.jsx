import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { useState } from "react";
import ReactPlayer from "react-player";
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
  const [introPlaying, setIntroPlaying] = useState(false);

  return (
    <div>
      <div className="mx-auto" style={{ maxWidth: 1280 }}>
        <div className="grid grid-nogutter text-800">
          <div className="col-12 md:col-6 p-0 py-2 md:p-6 text-center md:text-left flex align-items-center ">
            <section>
              <span className="text-5xl mb-1">
                USPSA Classification System Was Broken.
              </span>
              <span className="text-6xl text-primary font-bold mb-3"> We fixed it!</span>
              <span className="mt-0 mb-4 text-700 line-height-3">
                <p>
                  Our Classification System is 100% dynamic and calibrates itself
                  automatically using Statistical Analysis and Score Distribution.
                </p>

                <p>
                  And thanks to your support, we are now working on bringing it to USPSA.
                  <br />
                  Stay tuned!
                </p>
                <p>
                  We also have experimental <a href="https://scsa.hitfactor.info">SCSA</a>
                  &nbsp;and <a href="https://pcsl.hitfactor.info">PCSL</a> support. Check
                  It Out!
                </p>
              </span>

              <div className="flex flex-row justify-content-center md:justify-content-start">
                <Button
                  label="Read More"
                  type="button"
                  className="p-button-outlined"
                  onClick={() => {
                    document.getElementById("learnMore").scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                />
                <Button
                  label="Watch Intro Video"
                  type="button"
                  className="ml-3 p-button-raised"
                  onClick={() => setIntroPlaying(true)}
                />
              </div>
            </section>
          </div>
          <div
            className="col-12 md:col-6 overflow-hidden py-6"
            style={{ clipPath: "polygon(4% 0, 100% 0%, 100% 100%, 0 100%)" }}
          >
            <ReactPlayer
              playing={introPlaying}
              light={!introPlaying}
              controls={introPlaying}
              width="100%"
              height="100%"
              className="md:ml-auto block my-auto"
              style={{ minHeight: 360 }}
              url="https://www.youtube.com/watch?v=KrCgxLkoG9Y"
            />
          </div>
        </div>
        <Divider />
        <div id="learnMore" className="px-4 py-8 md:px-6 lg:px-8 overflow-hidden">
          <div className="font-bold text-900 text-3xl mb-3 text-center">
            Recommended Classification
          </div>
          <div className="text-700 text-center mb-5 line-height-3">
            Here's How Monkeys Have Fixed the Classification System
          </div>

          <div className="flex lg:justify-content-center mb-5">
            <div className="py-3 pr-8 pl-3 w-30rem hidden lg:block">
              <img
                src="/img/home/scrape.jpg"
                alt="Image"
                className="w-full mr-8"
                style={{ borderRadius: 22 }}
              />
            </div>
            <div className="flex flex-column align-items-center w-2rem">
              <span
                className="bg-blue-500 text-0 flex align-items-center justify-content-center border-circle"
                style={{ minWidth: "2.5rem", minHeight: "2.5rem" }}
              >
                1
              </span>
              <div
                className="h-full bg-blue-500"
                style={{ width: 2, minHeight: "4rem" }}
              />
            </div>
            <div className="py-3 pl-5 lg:pl-8 pl-3 lg:w-30rem">
              <div className="text-900 text-xl mb-2 font-medium">Real Match Data</div>
              <span className="block text-700 line-height-3 mb-3">
                First, We've Obtained Everyone's Classifier Scores
              </span>
              <div className="pt-3 border-top-1 border-300">
                <div className="mb-2 line-height-3">
                  <p>Literally Millions of Them (and Counting)</p>
                </div>
              </div>
              <img
                src="/img/home/scrape.jpg"
                alt="Image"
                style={{ borderRadius: 22 }}
                className="w-full mt-3 block lg:hidden"
              />
            </div>
          </div>

          <div className="flex justify-content-center mb-5">
            <div className="py-3 pl-5 pr-3 lg:pr-8 lg:pl-3 lg:w-30rem flex-order-1 lg:flex-order-0">
              <div className="text-900 text-xl mb-2 font-medium">Target Distribution</div>
              <span className="block text-700 line-height-3 mb-3">
                Using Statistical Analysis we found a "Perfect" Distribution
              </span>
              <div className="pt-3 border-top-1 border-300">
                <ul className="-ml-2">
                  <li className="mb-2 line-height-3">
                    Top 1% of Scores = GrandMasters (95%)
                  </li>
                  <li className="mb-2 line-height-3">Top 5% = Masters (85%)</li>
                  <li className="mb-2 line-height-3">Top 15% = A-class (75%)</li>
                </ul>
              </div>
              <img
                src="/img/home/graph.jpg"
                alt="Image"
                style={{ borderRadius: 22 }}
                className="w-full mt-3 block lg:hidden"
              />
            </div>
            <div className="flex flex-column align-items-center w-2rem flex-order-0 lg:flex-order-1">
              <span
                className="bg-yellow-500 text-0 flex align-items-center justify-content-center border-circle"
                style={{ minWidth: "2.5rem", minHeight: "2.5rem" }}
              >
                2
              </span>
              <div
                className="h-full bg-yellow-500"
                style={{ width: 2, minHeight: "4rem" }}
              />
            </div>
            <div className="py-3 pl-8 pr-3 w-30rem hidden lg:block flex-order-2">
              <img
                src="/img/home/graph.jpg"
                alt="Image"
                className="w-full mr-8"
                style={{ borderRadius: 22 }}
              />
            </div>
          </div>

          <div className="flex justify-content-center mb-5">
            <div className="py-3 pr-8 pl-3 w-30rem hidden lg:block">
              <img
                src="/img/home/brain.jpg"
                alt="Image"
                className="w-full mr-8"
                style={{ borderRadius: 22 }}
              />
            </div>
            <div className="flex flex-column align-items-center w-2rem">
              <span
                className="bg-cyan-500 text-0 flex align-items-center justify-content-center border-circle"
                style={{ minWidth: "2.5rem", minHeight: "2.5rem" }}
              >
                3
              </span>
              <div
                className="h-full bg-cyan-500"
                style={{ width: "2px", minHeight: "4rem" }}
              />
            </div>
            <div className="py-3 pl-5 lg:pl-8 pl-3 lg:w-30rem">
              <div className="text-900 text-xl mb-2 font-medium">
                Recommended High Hit Factors
              </div>
              <span className="block text-700 line-height-3 mb-3">
                After Extensive Research, and in Collaboration with USPSA Classifier
                Committee, we picked the Best Way to set High Hit-Factors
              </span>
              <div className="pt-3 border-top-1 border-300">
                <ul className="-ml-2">
                  <li className="mb-2 line-height-3">Fitted Weibull Distribution</li>
                  <ul>
                    <li className="mb-2 line-height-3">
                      Negative Log Likelyhood Error Function
                    </li>
                    <li className="mb-2 line-height-3">
                      Nelder-Mead Optimization Algorithm
                    </li>
                  </ul>
                  <li className="mb-2 line-height-3">Top 3% of Scores = 90% HHF</li>
                </ul>
              </div>
              <img
                src="/img/home/brain.jpg"
                alt="Image"
                style={{ borderRadius: 22 }}
                className="w-full mt-3 block lg:hidden"
              />
            </div>
          </div>

          <div className="flex justify-content-center mb-5">
            <div className="py-3 pl-5 pr-3 lg:pr-8 lg:pl-3 lg:w-30rem flex-order-1 lg:flex-order-0">
              <div className="text-900 text-xl mb-2 font-medium">
                Brutal Uncapped Classification Engine
              </div>
              <span className="block text-700 line-height-3 mb-3">
                Rec.HHFs made Individual Classifiers Easier
                <br /> So we made the Algorithm Harder
              </span>
              <div className="pt-3 border-top-1 border-300">
                <ul className="-ml-2">
                  <li className="mb-2 line-height-3">No B/C/D Flags</li>
                  <li className="mb-2 line-height-3">Same Day Dupes are Averaged Out</li>
                  <li className="mb-2 line-height-3">
                    Different Day Dupes use Most Recent One
                  </li>
                </ul>
                {/* <div className="mb-2 line-height-3">You're welcome, Grandbaggers</div> */}
              </div>
              <img
                src="/img/home/brutal.jpg"
                alt="Image"
                style={{ borderRadius: 22 }}
                className="w-full mt-3 block lg:hidden"
              />
            </div>
            <div className="flex flex-column align-items-center w-2rem flex-order-0 lg:flex-order-1">
              <span
                className="bg-pink-500 text-0 flex align-items-center justify-content-center border-circle"
                style={{ minWidth: "2.5rem", minHeight: "2.5rem" }}
              >
                4
              </span>
              <div
                className="h-full bg-pink-500"
                style={{ width: 2, minHeight: "4rem" }}
              />
            </div>
            <div className="py-3 pl-8 pr-3 w-30rem hidden lg:block flex-order-2">
              <img
                src="/img/home/brutal.jpg"
                style={{ borderRadius: 22 }}
                alt="Image"
                className="w-full mr-8"
              />
            </div>
          </div>
          <div className="flex lg:justify-content-center mb-5">
            <div className="py-3 pr-8 pl-3 w-30rem hidden lg:block">
              <img
                src="/img/home/science.jpg"
                alt="Image"
                className="w-full mr-8"
                style={{ borderRadius: 22 }}
              />
            </div>
            <div className="flex flex-column align-items-center w-2rem">
              <span
                className="bg-purple-500 text-0 flex align-items-center justify-content-center border-circle"
                style={{ minWidth: "2.5rem", minHeight: "2.5rem" }}
              >
                5
              </span>
              <div
                className="h-full bg-purple-500"
                style={{ width: 2, minHeight: "4rem" }}
              />
            </div>
            <div className="py-3 pl-5 lg:pl-8 pl-3 lg:w-30rem">
              <div className="text-900 text-xl mb-2 font-medium">ELO Correlation</div>
              <span className="block text-700 line-height-3 mb-3">
                To Verify Our Methods, we partnered with{" "}
                <a href="https://www.patreon.com/shootingsportsanalyst">
                  Jay Slater's Shooting Sport Analyst
                </a>{" "}
                and ran Correlation Analysis against his ELO ratings, ensuring optimal
                picks for:
              </span>
              <div className="pt-3 border-top-1 border-300">
                <ul className="-ml-2">
                  <li className="mb-2 line-height-3">Classification Algorithm</li>
                  <li className="mb-2 line-height-3">Scores Window</li>
                  <li className="mb-2 line-height-3">Classifier Quality Ratings</li>
                </ul>
              </div>
              <img
                src="/img/home/science.jpg"
                alt="Image"
                style={{ borderRadius: 22 }}
                className="w-full mt-3 block lg:hidden"
              />
            </div>
          </div>

          <div className="flex justify-content-center mb-5">
            <div className="py-3 pl-5 pr-3 lg:pr-8 lg:pl-3 lg:w-30rem flex-order-1 lg:flex-order-0">
              <div className="text-900 text-xl mb-2 font-medium">The Result?</div>
              <span className="block text-700 line-height-3 mb-3">
                An Improved Classification System that Accurately Reflects Your Shooting
                Skills and is Harder to Game
              </span>
              <div className="pt-3 border-top-1 border-300">
                <div className="mb-2 line-height-3">
                  <p>Top Shooters Are Still at The Top</p>
                  <Button
                    label="See For Yourself"
                    type="button"
                    className="mr-3 p-button-outlined"
                    onClick={() => navigate("/shooters/co/")}
                  />
                </div>
              </div>
              <img
                src="/img/home/champions.jpg"
                alt="Image"
                style={{ borderRadius: 22 }}
                className="w-full mt-3 block lg:hidden"
              />
            </div>
            <div className="flex flex-column align-items-center w-2rem flex-order-0 lg:flex-order-1">
              <span
                className="bg-cyan-500 text-0 flex align-items-center justify-content-center border-circle"
                style={{ minWidth: "2.5rem", minHeight: "2.5rem" }}
              >
                6
              </span>
              <div
                className="h-full bg-cyan-500"
                style={{ width: 2, minHeight: "4rem" }}
              />
            </div>
            <div className="py-3 pl-8 pr-3 w-30rem hidden lg:block flex-order-2">
              <img
                src="/img/home/champions.jpg"
                alt="Image"
                className="w-full mr-8"
                style={{ borderRadius: 22 }}
              />
            </div>
          </div>
        </div>
        <Divider />

        <div className="my-4 mx-auto">
          <div className="text-900 font-bold text-5xl mb-2 text-center">
            Pricing Plans
          </div>
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
                  <PricesBlock />
                  <ul className="list-none p-0 m-0 flex-grow-1">
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Accurate HHFs from Statistical Analysis</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Classifiaction Goes Up and Down</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Instant Reclassifiaction</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Discourages Grandbagging</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Full Division & Classifier Leaderboards</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Open-Source</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Unlimited Search By Partial Number or Name</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Find & Report Suspicious Scores</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Multi-Score "What Ifs"</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
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
                  <PricesBlock membership={65} clubAffiliation={75} classifier={3} />
                  <ul className="list-none p-0 m-0 flex-grow-1">
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-times-circle text-red-500 mr-2" />
                      <span>Variable Accuracy of HHFs</span>
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
                      <span>Allows Grandbagging (for a fee)</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-times-circle text-red-500 mr-2" />
                      <span>Top 20 Only</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-times-circle text-red-500 mr-2" />
                      <span>Closed Source</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-times-circle text-red-500 mr-2" />
                      <span>Search by Exact Number Only</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-times-circle text-red-500 mr-2" />
                      <span>No Report System</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-times-circle text-red-500 mr-2" />
                      <span>Calculator & History Only</span>
                    </li>
                  </ul>
                  <hr className="mb-3 mx-0 border-top-1 border-bottom-none border-300" />
                  <Button
                    label="Join USPSA"
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
                  <PricesBlock membership={45} clubAffiliation={50} />
                  <ul className="list-none p-0 m-0 flex-grow-1">
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Simple Timeplus Scoring</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Single Classifier</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Funny "Situational" WSBs</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-check-circle text-green-500 mr-2" />
                      <span>Stylish Fishing Vests Always in Fashion</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-times-circle text-red-500 mr-2" />
                      <span>No Reclassification</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-times-circle text-red-500 mr-2" />
                      <span>Frequent Match Bumps</span>
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
                      <span>Carry Optics allows Compensators</span>
                    </li>
                    <li className="flex align-items-center mb-3">
                      <i className="pi pi-times-circle text-red-500 mr-2" />
                      <span>Less Competition</span>
                    </li>
                  </ul>
                  <hr className="mb-3 mx-0 border-top-1 border-bottom-none border-300" />
                  <Button
                    label="Join IDPA"
                    className="p-3 w-full p-button-outlined"
                    onClick={() => window.open("https://idpa.com/membership", "_blank")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Divider />

        <div className="text-700 text-center pb-4">
          <div className="text-blue-600 font-bold mb-3">
            <i className="pi pi-discord" />
            &nbsp;POWERED BY DISCORD
          </div>
          <div className="text-900 font-bold text-5xl mb-3">
            Join Howler Monkey Community
          </div>
          <div className="text-700 text-xl mb-5">
            Use #hitfactor-info Channel for Any Questions or Feedback.
          </div>
          <Button
            label="Bring Bananas"
            icon="pi pi-discord"
            className="font-bold px-5 py-3 p-button-raised p-button-rounded white-space-nowrap"
            onClick={() => window.open("https://discord.gg/zgKq7RbQjx", "_blank")}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
