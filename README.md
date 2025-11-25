# 🕌 Faizane Madina Masjid Southend | Strapi Backend

**The headless CMS and API layer powering the Faizane Madina Masjid Southend digital platform.**

![Project Status](https://img.shields.io/badge/Status-Live%20Client%20Project-success)
![Tech](https://img.shields.io/badge/Tech-Strapi%20v5%20%7C%20TypeScript%20%7C%20PostgreSQL-purple)
![API](https://img.shields.io/badge/API-REST-green)

---

## 🔗 Related Project
This backend serves as the primary API for the **Faizane Madina Masjid Southend** website frontend.

* **Frontend Repository:** [faizan-e-madina-frontend](https://github.com/YusufQuresh1/faizan-e-madina-frontend.git)

---

## 📍 Overview
This repository contains the backend source code for the **Faizane Madina Masjid Southend** project.

Built with **Strapi v5**, this Headless CMS serves as the **centralised** data management hub for the mosque's administration. It provides a user-friendly admin panel for non-technical staff to update prayer times, announcements, and gallery images, which are then consumed by the React frontend via a RESTful API.

---

## ✨ Key Features

### 🗄️ Custom Content Architecture
The CMS is structured around specific data models tailored to mosque operations:
* **Timetables:** Stores monthly prayer schedules with support for complex JSON prayer data, specific months, and years.
* **Weekly Events:** Manages recurring weekly classes (Madrasa) and gatherings (Ijtimah/Jummah) with specific day/time enumerations.
* **Announcements:** A rich-text content type for publishing news and updates to the digital noticeboard.
* **Services:** Manages the list of community services offered by the mosque.
* **Gallery:** Handles media uploads for the frontend image gallery.

### ☁️ Media Management
* **Cloudinary Integration:** Configured with `@strapi/provider-upload-cloudinary` to offload media storage and delivery, ensuring **optimised** image loading for the frontend.

### 🔐 Security & Access
* **CORS Configuration:** Strictly configured middleware to allow requests only from **authorised** origins (e.g., local development ports, production domains).
* **Role-Based Access Control:** **Utilises** Strapi's Users & Permissions plugin to secure API endpoints.

---

## 🛠️ Tech Stack

* **Core Framework:** Strapi v5 (Headless CMS)
* **Language:** TypeScript
* **Database:** PostgreSQL (`pg` client configured)
* **Media Provider:** Cloudinary
* **Environment:** Node.js (>=18.0.0)

---

## 🏗️ Architecture & Setup

### Prerequisites
* Node.js (v18 or higher)
* A PostgreSQL database instance (or SQLite for local testing if configured).
* A Cloudinary account for media storage.

### 1. Installation
Clone the repository and install dependencies:

```bash
git clone [https://github.com/YusufQuresh1/faizan-e-madina-backend.git](https://github.com/YusufQuresh1/faizan-e-madina-backend.git)
cd faizan-e-madina-backend
npm install
````

### 2\. Environment Configuration

Create a `.env` file in the root directory. You can use `.env.example` as a template:

```env
# Server Configuration
HOST=0.0.0.0
PORT=1337

# Secrets (Generate new keys for production)
APP_KEYS="toBeModified1,toBeModified2"
API_TOKEN_SALT=tobemodified
ADMIN_JWT_SECRET=tobemodified
TRANSFER_TOKEN_SALT=tobemodified
JWT_SECRET=tobemodified

# Database (PostgreSQL)
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi
DATABASE_SSL=false

# Cloudinary Configuration
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret
```

### 3\. Run Locally

Start the development server with auto-reload:

```bash
npm run develop
```

The Admin Panel will be accessible at `http://localhost:1337/admin`.

-----

## 📂 Content Structure (API)

The backend exposes the following primary API endpoints (mapped from `src/api`):

| Content Type | Endpoint | Description |
| :--- | :--- | :--- |
| **Announcement** | `/api/announcements` | News and updates content. |
| **Gallery** | `/api/gallery` | Collection of images for the website gallery. |
| **Service** | `/api/services` | List of mosque services. |
| **Timetable** | `/api/timetables` | Monthly prayer time data (JSON format) and media. |
| **Weekly Event** | `/api/weekly-events` | Recurring weekly schedule items. |

-----

## 🧩 Key Code Highlight: Cloudinary Config

To ensure media is handled efficiently in production, the upload provider is swapped to Cloudinary in `config/plugins.ts`:

```typescript
export default ({ env }) => ({
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
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
```

-----

## 📬 Contact

**Yusuf Qureshi**
*Connect with me on LinkedIn to discuss this project further.*

  * [LinkedIn Profile](https://www.linkedin.com/in/mohammedyusufqureshi)
