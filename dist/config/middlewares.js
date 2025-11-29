module.exports = [
    'strapi::errors',
    {
        name: 'strapi::security',
        config: {
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    'connect-src': ["'self'", 'https:'],
                    'img-src': [
                        "'self'",
                        'data:',
                        'blob:',
                        'market-assets.strapi.io',
                        'res.cloudinary.com',
                    ],
                    'media-src': [
                        "'self'",
                        'data:',
                        'blob:',
                        'market-assets.strapi.io',
                        'res.cloudinary.com',
                    ],
                    upgradeInsecureRequests: null,
                },
            },
        },
    },
    {
        name: 'strapi::cors',
        config: {
            enabled: true,
            headers: '*',
            origin: [
                'http://localhost:5173',
                'http://localhost:3000',
                'http://localhost:1337',
                'https://yusufquresh1.github.io',
                'https://faizane-madina-masjid-southend.github.io',
                'https://193.123.187.241.nip.io',
            ],
        },
    },
    'strapi::poweredBy',
    'strapi::logger',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
];
