import React, { useState, Suspense, useEffect } from "react";
import { TabMenu } from "primereact/tabmenu";
import { ProgressSpinner } from "primereact/progressspinner";
import {
  createBrowserRouter,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";

const config = [
  {
    label: "Classification Stats",
    icon: "pi pi-chart-pie",
    path: "/classifications",
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
];

const activeIndexForPathname = (pathname) =>
  config
    .map((c) => c.path)
    .findIndex((curPath) => pathname?.startsWith(curPath));

const Menu = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [activeIndex, setActiveIndex] = useState(activeIndexForPathname);

  useEffect(() => setActiveIndex(activeIndexForPathname(pathname)), [pathname]);

  return (
    <TabMenu
      style={{ fontSize: "1.25rem" }}
      model={config.map((c) => ({ ...c, command: () => navigate(c.path) }))}
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
        <h3 style={{ fontStyle: "italic" }}>
          404 Not Found (or crash? I dunno)
        </h3>
      </div>
    ),
    children: [
      {
        path: "classifications",
        Component: React.lazy(() => import("../pages/ClassificationsPage")),
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
