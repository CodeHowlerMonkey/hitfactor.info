import React, { useRef, useState, Suspense, useEffect } from "react";
import { TabMenu } from "primereact/tabmenu";
import { Menu as PrimeMenu } from "primereact/menu";
import { ProgressSpinner } from "primereact/progressspinner";
import {
  createBrowserRouter,
  Outlet,
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
import { Divider } from "primereact/divider";
import Footer from "../components/Footer";
import features from "../../../shared/features";

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
        onClick={(e) => menu.current.toggle(e)}
      >
        {" "}
        <span className="pi pi-bars text-2xl" />
      </a>
    </>
  );
};

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
  /*{
    label: "Clubs",
    icon: "pi pi-sitemap",
    path: "/clubs",
  },*/
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
  <div className="card relative min-h-screen">
    <div style={{ paddingBottom: "13rem" }}>
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
      <div className="absolute h-13rem bottom-0 w-full">
        <Divider />
        <Footer />
      </div>
    </div>
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
        path: "",
        Component: React.lazy(() => import("../pages/HomePage")),
      },
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
