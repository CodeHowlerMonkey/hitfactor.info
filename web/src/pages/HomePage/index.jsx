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
          <div className="col-12 md:col-6 p-0 py-2 md:p-6 text-center md:text-left flex align-items-center justify-content-center mt-4">
            <section>
              <span className="text-4xl mb-1">PCSL Classifications (Unofficial)</span>
              <span className="mt-0 mb-4 text-700 line-height-3">
                <p>Quick HFI fork , using only PCSL 2Gun Nationals 2024 results.</p>

                <p>Every stage is a "classifier", uncapped scoring (no 100% limit).</p>
              </span>
            </section>
          </div>
          <div
            className="col-12 md:col-6 overflow-hidden py-6"
            style={{ clipPath: "polygon(4% 0, 100% 0%, 100% 100%, 0 100%)" }}
          >
            <img
              src="/img/home/champions.jpg"
              alt="Image"
              style={{
                height: 360,
                width: "100%",
                margin: "0, 16px",
                objectFit: "cover",
                objectPosition: "top",
              }}
            />
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
