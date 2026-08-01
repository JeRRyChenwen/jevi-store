JEVI Store

A production-ready e-commerce storefront built with Next.js, React, and TypeScript.

Overview

jevi-store is the customer-facing storefront of a modular full-stack e-commerce platform. It supports product browsing, variant selection, shopping bag management, checkout, PayPal payments, order confirmation, SEO, analytics, and integration with separate backend and CMS services.

Key Features

Responsive storefront for desktop and mobile

Product listing, category, and product detail pages

Colour, size, and height-increase variant selection

Shopping bag and multi-step checkout

Customer address and delivery handling

PayPal payment integration

Order confirmation and post-purchase flows

Product SEO metadata and canonical URLs

XML sitemap and robots configuration

Product structured data using JSON-LD

Google Analytics 4 integration

Google Search Console and Google Merchant Center readiness

Strapi-powered products, categories, images, banners, and SEO content

Technology Stack

Next.js 15

React

TypeScript

App Router

Tailwind CSS

shadcn/ui

Strapi REST API

PayPal

Google Analytics 4

Docker and Docker Compose

Related Services

jevi-store — customer-facing storefront

jevi-admin-platform — administration dashboard

jevi-api — core business API

jevi-strapi — product content management system

mailer-api — transactional email service

jevi-deployment — production deployment and orchestration

Project Structure

src/
├── app/            # App Router pages, layouts, metadata, and routes
├── components/     # Reusable UI and business components
├── lib/            # API clients, utilities, configuration, and helpers
└── ...

public/             # Static assets, logos, favicons, and images

Local Development

Prerequisites

Node.js 20 or later

npm

Docker Desktop when using the container workflow

Access to the required API and Strapi services

Start with Docker Compose

Set-Location "D:\Jevi Apparel Studio\jevi-store"

docker compose `
  -f docker-compose.local.yml `
  up -d

Local storefront:

http://127.0.0.1:3000

View logs:

docker compose `
  -f docker-compose.local.yml `
  logs --tail=100 jevi-store

Stop:

docker compose `
  -f docker-compose.local.yml `
  down

Start with npm

npm install
npm run dev

Environment Configuration

Keep local and production configuration in environment files excluded from Git.

Known analytics variables:

NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_GA_ENABLE_DEVELOPMENT=false

Do not commit:

.env

.env.local

.env.production

API tokens

payment secrets

database credentials

private customer or order data

A public repository should include a safe .env.example containing variable names only.

Build and Verification

npm run build
npm run start

Before deployment, verify:

Production build completes

Product and category pages return HTTP 200

Checkout and PayPal flows work

Canonical URLs and metadata are correct

Sitemap and robots routes are accessible

JSON-LD product data is present

No secrets or private data are included

Production Deployment

The production platform uses:

Ubuntu VPS

Docker Compose

Caddy reverse proxy

Cloudflare DNS, CDN, SSL, and security controls

Separate PostgreSQL-backed business and Strapi services

Production deployment configuration should remain in the dedicated deployment repository rather than being hard-coded into the storefront.

Documentation

Internal development notes are maintained in:

DEVELOPMENT_NOTES.md

Use that file for local commands, troubleshooting notes, pending work, and implementation decisions that do not belong in the public README.

Repository Safety

Before making this repository public:

Review the complete Git history for secrets.

Confirm environment files are ignored.

Replace production values with placeholders.

Remove customer, order, and operational data.

Add an appropriate open-source licence when applicable.

Licence

No reuse rights are granted unless a LICENSE file is added to the repository.