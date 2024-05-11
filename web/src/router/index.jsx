import React, { useState, Suspense, useEffect } from "react";
import { TabMenu } from "primereact/tabmenu";
import { ProgressSpinner } from "primereact/progressspinner";
import {
  createBrowserRouter,
  Outlet,
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";

const config = [
  {
    label: "Howler Monkey Classifiers",
    template: (item) => (
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
  {
    label: "Clubs",
    icon: "pi pi-sitemap",
    path: "/clubs",
  },
  {
    label: "Upload",
    icon: "pi pi-upload",
    path: "/upload",
  },
  {
    className: "flex-grow-1",
    separator: true,
    disabled: true,
    style: { opacity: 1 },
  },
  {
    template: () => (
      <Link
        className="flex p-menuitem-link no-highlight"
        to="https://github.com/CodeHowlerMonkey/hitfactor.info"
        target="_blank"
      >
        {" "}
        <span className="pi pi-github text-2xl" />
      </Link>
    ),
  },
];

const activeIndexForPathname = (pathname) =>
  config.map((c) => c.path).findLastIndex((curPath) => pathname?.startsWith(curPath));

const Menu = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  let [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => setActiveIndex(activeIndexForPathname(pathname)), [pathname]);

  // Don't stay on github link, just go back, so it works like a button
  if (activeIndex === config.length - 1) {
    activeIndex = activeIndexForPathname(pathname);
  }

  return (
    <TabMenu
      className="text-base md:text-xl"
      model={config.map((c) => ({
        ...c,
        command: () => navigate(c.path),
      }))}
      activeIndex={activeIndex}
      onTabChange={(e) => setActiveIndex(e.index)}
    />
  );
};

const Layout = () => (
  <div className="card">
    <Menu />
    <Suspense
      fallback={
        <div className="flex flex-justify-around p-4">
          <ProgressSpinner />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  </div>
);

const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    errorElement: (
      <div className="card">
        <Menu />
        <h2>Sent It A Bit Too Hard, Bud!</h2>
        <h3 style={{ fontStyle: "italic" }}>404 Not Found (or crash? I dunno)</h3>
      </div>
    ),
    children: [
      {
        path: "stats",
        Component: React.lazy(() => import("../pages/StatsPage")),
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
        path: "clubs",
        Component: React.lazy(() => import("../pages/ClubsPage")),
      },
      {
        path: "upload",
        Component: React.lazy(() => import("../pages/UploadPage")),
      },
    ],
  },
]);

export default router;
