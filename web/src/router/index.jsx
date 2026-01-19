import { Divider } from "primereact/divider";
import { Menu as PrimeMenu } from "primereact/menu";
import { ProgressSpinner } from "primereact/progressspinner";
import { TabMenu } from "primereact/tabmenu";
import React, { useRef, useState, Suspense, useEffect } from "react";
import {
  createBrowserRouter,
  Outlet,
  useNavigate,
  useLocation,
  Link,
  Navigate,
  useRouteError,
} from "react-router-dom";

import features from "../../../shared/features";
import Footer from "../components/Footer";

const MoreMenu = () => {
  const loggedIn = false;
  const menu = useRef(null);
  const items = [
    loggedIn && {
      icon: "pi pi-user-edit",
      label: "Profile / Settings",
    },
    loggedIn && {
      icon: "pi pi-book",
      label: "Classification Record",
    },
    {
      label: "GitHub",
      icon: "pi pi-github",
      url: "https://github.com/CodeHowlerMonkey/hitfactor.info",
      target: "_blank",
    },
    {
      separator: true,
    },
    loggedIn && {
      icon: "pi pi-sign-out",
      label: "Logout",
    },
    !loggedIn && {
      icon: "pi pi-sign-in",
      label: "Login",
      url: "/api/login",
    },
    !loggedIn && {
      label: "Register",
      url: "/api/register",
    },
  ];

  return (
    <>
      <PrimeMenu
        model={items}
        popup
        ref={menu}
        popupAlignment="right"
        pt={{
          root: { className: "-mt-5", style: { overflow: "hidden" } },
          menu: { style: { width: "max-content" } },
        }}
      />
      <a
        className="flex p-menuitem-link no-highlight px-2"
        onClick={e => menu.current.toggle(e)}
      >
        {" "}
        <span className="pi pi-bars text-2xl" />
      </a>
    </>
  );
};

const scsaOnlyConfig = [
  {
    label: "SCSA Classifiers",
    icon: "pi pi-chart-bar",
    path: "/",
  },
];

const mainConfig = [
  {
    label: "Howler Monkey Classifiers",
    template: item => (
      <Link className="flex p-menuitem-link" to={item.href}>
        <img
          alt="Howler Monkey Classifiers"
          src="/logo.png"
          style={{ maxWidth: "calc(min(12vw, 64px))" }}
        />
      </Link>
    ),
    path: "/",
  },
  {
    label: "Stats",
    icon: "pi pi-chart-pie",
    path: "/stats",
  },
  {
    label: "Classifiers",
    icon: "pi pi-chart-bar",
    path: "/classifiers",
  },
  {
    label: "Shooters",
    icon: "pi pi-users",
    path: "/shooters",
  },
  /*{
    label: "Clubs",
    icon: "pi pi-sitemap",
    path: "/clubs",
  },*/
  {
    label: "Uploads",
    icon: "pi pi-upload",
    path: "/upload",
  },
  {
    label: "Majors",
    icon: "pi pi-trophy",
    path: "/majors",
  },
  {
    visible: location.hostname === "localhost",
    label: "Reports",
    icon: "pi pi-flag",
    path: "/reports",
  },
  {
    className: "flex-grow-1",
    separator: true,
    disabled: true,
    style: { opacity: 1 },
  },
  {
    visible: !features.users,
    template: () => (
      <Link
        className="flex p-menuitem-link no-highlight px-2"
        to="https://github.com/CodeHowlerMonkey/hitfactor.info"
        target="_blank"
      >
        {" "}
        <span className="pi pi-github text-2xl" />
      </Link>
    ),
  },
  {
    visible: features.users,
    template: () => <MoreMenu />,
  },
];

const config = features.scsaOnly ? scsaOnlyConfig : mainConfig;

const activeIndexForPathname = pathname =>
  config.map(c => c.path).findLastIndex(curPath => pathname?.startsWith(curPath));

const Menu = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // eslint-disable-next-line prefer-const
  let [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => setActiveIndex(activeIndexForPathname(pathname)), [pathname]);

  // Don't stay on github link, just go back, so it works like a button
  if (activeIndex === config.length - 1) {
    activeIndex = activeIndexForPathname(pathname);
  }

  return (
    <TabMenu
      className="text-base md:text-xl"
      model={config.map(c => ({
        ...c,
        command: () => navigate(c.path),
      }))}
      activeIndex={activeIndex}
      onTabChange={e => setActiveIndex(e.index)}
    />
  );
};

const CommonLayout = ({ children }) => (
  <div className="card relative min-h-screen">
    <div style={{ paddingBottom: "13rem" }}>
      <Menu />
      {children}
      <div className="absolute h-13rem bottom-0 w-full">
        <Divider />
        <Footer />
      </div>
    </div>
  </div>
);

const chunkErrorMessages = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Loading chunk",
];
const ErrorElement = () => {
  const error = useRouteError();

  useEffect(() => {
    const isChunkError = chunkErrorMessages.some(msg =>
      error?.message?.toLowerCase().includes(msg.toLowerCase()),
    );

    if (isChunkError) {
      const chunkErrorTimestamp = localStorage.getItem("chunk-error-ts");
      if (Number(chunkErrorTimestamp) + 5_000 < new Date().getTime()) {
        localStorage.setItem("chunk-error-ts", new Date().getTime());
        window.location.reload();
      } else {
        console.error("already refreshed once");
      }
    }
  }, [error]);

  return (
    <CommonLayout>
      <h2>Sent It A Bit Too Hard, Bud!</h2>
      <h3 style={{ fontStyle: "italic" }}>404 Not Found (or crash? I dunno)</h3>
    </CommonLayout>
  );
};

const Layout = () => (
  <CommonLayout>
    <Suspense
      fallback={
        <div className="flex flex-justify-around p-4">
          <ProgressSpinner />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  </CommonLayout>
);
const RedirectToClassifiers = () => <Navigate to="/classifiers" replace />;
const HomePage = React.lazy(() => import("../pages/HomePage"));

const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    errorElement: <ErrorElement />,
    children: [
      {
        path: "",
        Component: features.scsaOnly ? RedirectToClassifiers : HomePage,
      },
      {
        path: "classifiers/:division?/:classifier?",
        Component: React.lazy(() => import("../pages/ClassifiersPage")),
      },
      {
        path: "shooters/:division?/:memberNumber?",
        Component: React.lazy(() => import("../pages/ShootersPage")),
      },
      {
        path: "stats",
        Component: React.lazy(() => import("../pages/StatsPage")),
      },
      {
        path: "clubs",
        Component: React.lazy(() => import("../pages/ClubsPage")),
      },
      {
        path: "upload/:uuid?/:division?",
        Component: React.lazy(() => import("../pages/UploadPage")),
      },
      {
        path: "majors",
        Component: React.lazy(() => import("../pages/MajorsPage")),
      },
      {
        path: "pslink/:uuid?",
        Component: React.lazy(() => import("../pages/PSLinkPage")),
      },
      ...(location.hostname !== "localhost"
        ? []
        : [
            {
              path: "reports",
              Component: React.lazy(() => import("../pages/ReportsPage")),
            },
          ]),
    ],
  },
]);

export default router;
