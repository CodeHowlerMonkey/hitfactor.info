export default ({ className }) => (
  <div className={className}>
    <div className="px-4 py-0 md:px-6 lg:px-8 text-center">
      <img src="/img/home/howlerData.png" alt="Howler Monkey Data, Inc" height="64" />
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
