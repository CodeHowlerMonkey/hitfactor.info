const badgeSrc =
  "https://simpleanalyticsbadges.com/hitfactor.info?mode=dark&background=5b3dbb&text=d9d4f0&logo=d9d4f0";
const SimpleAnalyticsBadge = () => (
  <a
    href="https://dashboard.simpleanalytics.com/hitfactor.info?utm_source=hitfactor.info&utm_content=badge"
    referrerPolicy="origin"
    target="_blank"
  >
    <picture>
      <source srcSet={badgeSrc} media="(prefers-color-scheme: dark)" />
      <img
        src={badgeSrc}
        loading="lazy"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
      />
    </picture>
  </a>
);

export default ({ className }) => (
  <div className={className}>
    <div className="px-4 py-0 md:px-6 lg:px-8 text-center">
      <div className="flex flex-row mx-auto max-w-min gap-3 align-items-center">
        <img src="/img/home/howlerData.png" alt="Howler Monkey Data, Inc" height="64" />
        <SimpleAnalyticsBadge />
      </div>
      <div className="font-medium text-900 mt-2 mb-1">© 2024 Howler Monkey Data, Inc</div>
      <p className="text-600 line-height-3 mt-0 mb-4">Made with 🧩 and 🍺 in 🇰🇷</p>
      <div className="flex align-items-center justify-content-center">
        <a
          className="cursor-pointer text-700 mr-5"
          href="https://instagram.com/codehowlermonkey"
          target="_blank"
        >
          <i className="pi pi-instagram"></i>
        </a>
        <a
          className="cursor-pointer text-700"
          href="https://github.com/CodeHowlerMonkey/hitfactor.info"
          target="_blank"
        >
          <i className="pi pi-github"></i>
        </a>
      </div>
    </div>
  </div>
);
