// config/plugins.ts
export default ({ env }) => ({
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
        secure: true,
        access_mode: 'public',
      },
      actionOptions: {
        upload: {
          folder: 'faizan-e-madina-uploads',
        },
        delete: {},
      },
    },
  },
});

