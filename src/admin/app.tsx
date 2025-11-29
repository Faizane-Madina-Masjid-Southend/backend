import logo from "./extensions/dawat-e-islami-green.png";

export default {
  config: {
    head: {
      favicon: logo,
    },
    auth: {
      logo: logo,
    },
    menu: {
      logo: logo,
    },
    translations: {
      en: {
        "Auth.form.welcome.title": "Faizane Madina Masjid Southend Admin",
        "Auth.form.welcome.subtitle":
          "Manage prayer times, announcements, and community content.",
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
  bootstrap() {
    console.log("--- ADMIN CONFIG LOADED ---");
  },
};
