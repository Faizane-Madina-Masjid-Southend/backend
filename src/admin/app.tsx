import type { StrapiApp } from "@strapi/strapi/admin";
import { Navigate } from "react-router-dom";
import logo from "./extensions/dawat-e-islami-green.png";
import favicon from "./extensions/favicon.png";

export default {
  config: {
    head: { favicon: favicon },
    auth: { logo: logo },
    menu: { logo: logo },
    translations: {
      en: {
        "Auth.form.welcome.title": "Faizane Madina Masjid Admin",
        "Auth.form.welcome.subtitle": "Log in to manage prayer times",
        "app.components.LeftMenu.navbrand.title": "Dashboard",
      },
    },
    theme: {
      light: {
        colors: {
          primary100: "#e6f2ed",
          primary200: "#bce2c6",
          primary500: "#047857",
          primary600: "#065f46",
          primary700: "#173424",
          secondary100: "#fffbf0",
          secondary500: "#ffc107",
          buttonPrimary500: "#047857",
          buttonPrimary600: "#065f46",
        },
      },
      dark: {
        colors: {
          primary100: "#173424",
          primary200: "#065f46",
          primary500: "#047857",
          primary600: "#0aa175",
          primary700: "#047857",
          secondary100: "#3d3000",
          secondary500: "#ffc107",
          buttonPrimary500: "#047857",
          buttonPrimary600: "#065f46",
        },
      },
    },
    tutorials: false,
    notifications: { releases: false },
  },
  bootstrap(app: StrapiApp) {
    console.log("--- ADMIN CONFIG LOADED ---");

    const appWithMenu = app as any;

    if (appWithMenu.menu) {
      appWithMenu.menu = appWithMenu.menu.filter((item: any) => {
        return (
          item.to !== "/" &&
          item.to !== "/admin" &&
          item.intlLabel?.id !== "app.components.LeftMenu.navbrand.title"
        );
      });
    }

    const style = document.createElement("style");
    style.innerHTML = `
      /* Hide the Dashboard link by finding the link to /admin */
      nav a[href="/admin"], 
      nav a[href="/"],
      a[aria-label="Dashboard"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  },
  register(app: StrapiApp) {
    const indexRoute = app.router.routes.find(
      (route) =>
        route.index === true ||
        route.path === "/" ||
        (typeof route.path === "string" && route.path.endsWith("admin/"))
    );

    if (indexRoute) {
      indexRoute.lazy = undefined;
      indexRoute.Component = undefined;
      indexRoute.element = <Navigate to="/content-manager" replace />;
    }
  },
};
