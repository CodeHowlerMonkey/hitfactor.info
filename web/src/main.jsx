import React, { useState, Suspense, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { PrimeReactProvider } from "primereact/api";
import { TabMenu } from "primereact/tabmenu";
import "primereact/resources/themes/soho-dark/theme.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useNavigate,
  useLocation,
} from "react-router-dom";
import "./index.css";

export const AppPage = React.lazy(() => import("./App.jsx"));
export const ClassificationStatsPage = React.lazy(() =>
  import("./classifications")
);
export const ClassifiersPage = React.lazy(() => import("./classifiers"));

const UnderConstruction = () => (
  <>
    <h2>I'm Digging As Fast As I Can</h2>
    <h3 style={{ fontStyle: "italic" }}>503 Under Construction</h3>
  </>
);
const ClubsPage = UnderConstruction;
const ShootersPage = UnderConstruction;
const UploadPage = UnderConstruction;

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
  /*
  {
    label: "Bad Link",
    icon: "pi pi-ban",
    path: "/bad",
  },*/
];
const Menu = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [activeIndex, setActiveIndex] = useState(
    config
      .map((c) => c.path)
      .findIndex((curPath) => pathname.startsWith(curPath))
  );

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
    <Outlet />
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
        <h3 style={{ fontStyle: "italic" }}>404 Not Found</h3>
      </div>
    ),
    children: [
      {
        path: "app",
        Component: AppPage,
      },
      {
        path: "classifications",
        Component: ClassificationStatsPage,
      },
      {
        path: "classifiers/:division?/:classifier?",
        Component: ClassifiersPage,
      },
      {
        path: "shooters",
        Component: ShootersPage,
      },
      {
        path: "clubs",
        Component: ClubsPage,
      },
      {
        path: "upload",
        Component: UploadPage,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PrimeReactProvider>
      <Suspense fallback={<div>loading</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </PrimeReactProvider>
  </React.StrictMode>
);
