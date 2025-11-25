// @ts-ignore
import type { Core } from '@strapi/strapi';

export default {
  /**
  * An asynchronous register function that runs before
  * your application is initialized.
  *
  * This gives you an opportunity to extend code.
  */
  // @ts-ignore
  register({ strapi }: { strapi: Core.Strapi }) {
    // This is the new code from the GitHub fix
    // It forces the socket to be treated as encrypted for proxy setups
    strapi.server.use(async (ctx, next) => {
      if (ctx.req?.socket) {
        // @ts-ignore
        (ctx.req.socket).encrypted = true;
      }
      await next();
    });
  },

  /**
  * An asynchronous bootstrap function that runs before
  * your application gets started.
  *
  * This gives you an opportunity to set up your data model,
  * run jobs, or perform some special logic.
  */
  bootstrap(/* { strapi }: { strapi: Core.Strapi } */) {},
};