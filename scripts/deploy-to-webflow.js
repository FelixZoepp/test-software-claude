#!/usr/bin/env node

/**
 * Webflow Deploy Script
 *
 * Deployt den generierten Funnel zu Webflow über deren API.
 * Erstellt Seiten und CMS-Collection-Einträge.
 *
 * Verwendung:
 *   node scripts/deploy-to-webflow.js
 *
 * Benötigt Umgebungsvariablen:
 *   WEBFLOW_API_TOKEN, WEBFLOW_SITE_ID, WEBFLOW_COLLECTION_ID
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const WEBFLOW_API = 'https://api.webflow.com/v2';
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

function getHeaders() {
  return {
    Authorization: 'Bearer ' + process.env.WEBFLOW_API_TOKEN,
    'Content-Type': 'application/json',
    accept: 'application/json',
  };
}

async function getSiteInfo() {
  const res = await axios.get(WEBFLOW_API + '/sites/' + process.env.WEBFLOW_SITE_ID, {
    headers: getHeaders(),
  });
  return res.data;
}

async function listPages() {
  const res = await axios.get(
    WEBFLOW_API + '/sites/' + process.env.WEBFLOW_SITE_ID + '/pages',
    { headers: getHeaders() }
  );
  return res.data.pages || [];
}

async function createOrUpdatePage(slug, title, htmlContent) {
  const pages = await listPages();
  const existing = pages.find(function (p) {
    return p.slug === slug;
  });

  if (existing) {
    console.log('Seite "' + slug + '" existiert bereits, wird aktualisiert...');
    const res = await axios.put(
      WEBFLOW_API + '/pages/' + existing.id,
      {
        body: {
          title: title,
          slug: slug,
        },
      },
      { headers: getHeaders() }
    );
    return res.data;
  }

  console.log('Erstelle neue Seite: ' + slug);
  const res = await axios.post(
    WEBFLOW_API + '/sites/' + process.env.WEBFLOW_SITE_ID + '/pages',
    {
      title: title,
      slug: slug,
      body: htmlContent,
    },
    { headers: getHeaders() }
  );
  return res.data;
}

async function ensureLeadsCollection() {
  const collectionsRes = await axios.get(
    WEBFLOW_API + '/sites/' + process.env.WEBFLOW_SITE_ID + '/collections',
    { headers: getHeaders() }
  );
  const collections = collectionsRes.data.collections || [];
  const leadsCollection = collections.find(function (c) {
    return c.slug === 'leads' || c.id === process.env.WEBFLOW_COLLECTION_ID;
  });

  if (leadsCollection) {
    console.log('Leads-Collection gefunden:', leadsCollection.id);
    return leadsCollection.id;
  }

  console.log('Leads-Collection nicht gefunden. Bitte in Webflow manuell erstellen oder WEBFLOW_COLLECTION_ID setzen.');
  return process.env.WEBFLOW_COLLECTION_ID || null;
}

async function publishSite() {
  console.log('Veröffentliche Webflow-Seite...');
  const res = await axios.post(
    WEBFLOW_API + '/sites/' + process.env.WEBFLOW_SITE_ID + '/publish',
    { publishToWebflowSubdomain: true },
    { headers: getHeaders() }
  );
  return res.data;
}

async function deploy() {
  console.log('Starte Webflow-Deployment...\n');

  // 1. Site-Info prüfen
  const site = await getSiteInfo();
  console.log('Ziel-Site:', site.displayName || site.name);
  console.log('Domain:', (site.customDomains && site.customDomains[0] && site.customDomains[0].url) || site.shortName + '.webflow.io');
  console.log('');

  // 2. Landing Page deployen
  const landingPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(landingPath)) {
    const landingHtml = fs.readFileSync(landingPath, 'utf-8');
    await createOrUpdatePage('funnel', 'Lead Funnel', landingHtml);
    console.log('Landing Page deployed.');
  } else {
    console.error('dist/index.html nicht gefunden. Bitte zuerst "npm run generate-funnel" ausführen.');
    process.exit(1);
  }

  // 3. Thank-You Page deployen
  const thankYouPath = path.join(DIST_DIR, 'danke', 'index.html');
  if (fs.existsSync(thankYouPath)) {
    const thankYouHtml = fs.readFileSync(thankYouPath, 'utf-8');
    await createOrUpdatePage('funnel-danke', 'Vielen Dank', thankYouHtml);
    console.log('Thank-You Page deployed.');
  }

  // 4. Leads-Collection sicherstellen
  const collectionId = await ensureLeadsCollection();
  if (collectionId) {
    console.log('Leads werden in Collection ' + collectionId + ' gespeichert.');
  }

  // 5. Veröffentlichen
  await publishSite();
  console.log('\nDeployment abgeschlossen!');

  const domain = (site.customDomains && site.customDomains[0] && site.customDomains[0].url) || 'https://' + site.shortName + '.webflow.io';
  console.log('Funnel-URL: ' + domain + '/funnel');
  console.log('Thank-You-URL: ' + domain + '/funnel-danke');
}

if (require.main === module) {
  if (!process.env.WEBFLOW_API_TOKEN) {
    console.error('Fehler: WEBFLOW_API_TOKEN ist nicht gesetzt.');
    console.error('Erstellen Sie eine .env Datei basierend auf .env.example');
    process.exit(1);
  }

  deploy().catch(function (err) {
    console.error('Deployment fehlgeschlagen:', err.response ? err.response.data : err.message);
    process.exit(1);
  });
}

module.exports = { deploy };
