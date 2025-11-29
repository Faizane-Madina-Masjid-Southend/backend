export default {
  config: {
    translations: {
      en: {
        "Auth.form.welcome.title": "Faizane Madina Masjid Southend Admin",
        "Auth.form.welcome.subtitle":
          "Manage prayer times, events, and community content.",
        "app.components.LeftMenu.navbrand.title": "Dashboard",
      },
    },
    theme: {
      light: {
        colors: {
          primary100: "#e6f2ed",
          // Borders
          primary200: "#bce2c6",

          primary500: "#047857",
          primary600: "#065f46",
          primary700: "#173424",

          secondary100: "#fffbf0",
          secondary500: "#ffc107",
          secondary600: "#ecc24d",
          secondary700: "#d6b047",

          buttonPrimary500: "#047857",
          buttonPrimary600: "#065f46",
        },
      },
    },
    tutorials: false,
    notifications: { releases: false },
  },
  bootstrap(app: any) {
    console.log(app);
  },
};
