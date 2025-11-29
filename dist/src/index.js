"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    /**
    * An asynchronous register function that runs before
    * your application is initialized.
    *
    * This gives you an opportunity to extend code.
    */
    // @ts-ignore
    register({ strapi }) {
        // This is the new code from the GitHub fix
        // It forces the socket to be treated as encrypted for proxy setups
        strapi.server.use(async (ctx, next) => {
            var _a;
            if ((_a = ctx.req) === null || _a === void 0 ? void 0 : _a.socket) {
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
    bootstrap( /* { strapi }: { strapi: Core.Strapi } */) { },
};
