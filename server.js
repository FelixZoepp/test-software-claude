#!/usr/bin/env node

/**
 * Funnel Generator - Web Application Server
 *
 * Startet die WebApp mit:
 * - Admin-Dashboard zum Konfigurieren und Vorschauen von Funnels
 * - API zum Generieren und Speichern
 * - Hosting der generierten Funnels unter eigener Domain
 *
 * Verwendung:
 *   node server.js
 *   PORT=4000 node server.js
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { generate } = require('./scripts/generate-funnel');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const FUNNELS_DIR = path.join(DATA_DIR, 'funnels');

// Verzeichnisse sicherstellen
[DATA_DIR, FUNNELS_DIR].forEach(function (dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Statische Dateien für das Dashboard
app.use('/dashboard/assets', express.static(path.join(ROOT, 'webapp', 'assets')));

// ─── Dashboard Routes ───────────────────────────────────────────────

app.get('/', function (req, res) {
  res.redirect('/dashboard');
});

app.get('/dashboard', function (req, res) {
  res.sendFile(path.join(ROOT, 'webapp', 'dashboard.html'));
});

// ─── API Routes ─────────────────────────────────────────────────────

// Alle gespeicherten Funnels auflisten
app.get('/api/funnels', function (req, res) {
  const funnels = [];
  if (fs.existsSync(FUNNELS_DIR)) {
    const dirs = fs.readdirSync(FUNNELS_DIR);
    dirs.forEach(function (dir) {
      const configPath = path.join(FUNNELS_DIR, dir, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        funnels.push({
          id: dir,
          name: config.companyName || dir,
          headline: config.headline || '',
          createdAt: config.createdAt || '',
          domain: config.customDomain || '',
        });
      }
    });
  }
  res.json({ funnels: funnels });
});

// Einzelnen Funnel abrufen
app.get('/api/funnels/:id', function (req, res) {
  const configPath = path.join(FUNNELS_DIR, req.params.id, 'config.json');
  if (!fs.existsSync(configPath)) {
    return res.status(404).json({ error: 'Funnel nicht gefunden' });
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  res.json(config);
});

// Preview generieren (ohne Speichern)
app.post('/api/preview', function (req, res) {
  try {
    const config = req.body;
    const Handlebars = require('handlebars');
    const templatePath = path.join(ROOT, 'templates', 'landing-page', 'index.hbs');
    const cssPath = path.join(ROOT, 'templates', 'assets', 'css', 'funnel.css');
    const jsPath = path.join(ROOT, 'templates', 'assets', 'js', 'funnel.js');

    const source = fs.readFileSync(templatePath, 'utf-8');
    const css = fs.readFileSync(cssPath, 'utf-8');
    const jsCode = fs.readFileSync(jsPath, 'utf-8');
    const template = Handlebars.compile(source);

    // Metriken-Optimierung
    const vars = Object.assign({}, config);
    vars.currentYear = new Date().getFullYear();
    vars.assetsBasePath = './';
    const goal = parseFloat(vars.conversionGoal) || 0.05;
    if (goal > 0.08) {
      vars.showUrgency = true;
      vars.showSocialProof = true;
      vars.layoutMode = 'aggressive';
    } else if (goal > 0.04) {
      vars.showUrgency = false;
      vars.showSocialProof = true;
      vars.layoutMode = 'balanced';
    } else {
      vars.showUrgency = false;
      vars.showSocialProof = false;
      vars.layoutMode = 'minimal';
    }

    let html = template(vars);

    // CSS und JS inline einbetten für die Preview
    html = html.replace(
      '<link rel="stylesheet" href="./assets/css/funnel.css">',
      '<style>' + css + '</style>'
    );
    html = html.replace(
      '<script src="./assets/js/funnel.js"></script>',
      '<script>' + jsCode + '</script>'
    );

    res.json({ html: html, layoutMode: vars.layoutMode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Funnel speichern und generieren
app.post('/api/funnels', function (req, res) {
  try {
    const config = req.body;
    const id =
      config.id ||
      (config.companyName || 'funnel')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
        '-' +
        Date.now().toString(36);

    const funnelDir = path.join(FUNNELS_DIR, id);
    const distDir = path.join(funnelDir, 'dist');
    if (!fs.existsSync(funnelDir)) fs.mkdirSync(funnelDir, { recursive: true });

    // Konfiguration speichern
    config.id = id;
    config.createdAt = config.createdAt || new Date().toISOString();
    config.updatedAt = new Date().toISOString();
    fs.writeFileSync(path.join(funnelDir, 'config.json'), JSON.stringify(config, null, 2));

    // Funnel generieren
    const overrides = Object.assign({}, config);
    overrides.leadWebhookUrl = overrides.leadWebhookUrl || '/api/leads/' + id;

    // Generate direkt in den Funnel-Ordner
    const Handlebars = require('handlebars');
    const TEMPLATES = path.join(ROOT, 'templates');

    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    if (!fs.existsSync(path.join(distDir, 'danke')))
      fs.mkdirSync(path.join(distDir, 'danke'), { recursive: true });
    if (!fs.existsSync(path.join(distDir, 'assets', 'css')))
      fs.mkdirSync(path.join(distDir, 'assets', 'css'), { recursive: true });
    if (!fs.existsSync(path.join(distDir, 'assets', 'js')))
      fs.mkdirSync(path.join(distDir, 'assets', 'js'), { recursive: true });

    const vars = Object.assign({}, overrides);
    vars.currentYear = new Date().getFullYear();
    const goal = parseFloat(vars.conversionGoal) || 0.05;
    if (goal > 0.08) {
      vars.showUrgency = true;
      vars.showSocialProof = true;
    } else if (goal > 0.04) {
      vars.showUrgency = false;
      vars.showSocialProof = true;
    } else {
      vars.showUrgency = false;
      vars.showSocialProof = false;
    }

    // Landing Page
    const landingSrc = fs.readFileSync(path.join(TEMPLATES, 'landing-page', 'index.hbs'), 'utf-8');
    const landingVars = Object.assign({}, vars, { assetsBasePath: './' });
    fs.writeFileSync(
      path.join(distDir, 'index.html'),
      Handlebars.compile(landingSrc)(landingVars)
    );

    // Thank-You
    const thankSrc = fs.readFileSync(
      path.join(TEMPLATES, 'thank-you-page', 'index.hbs'),
      'utf-8'
    );
    const thankVars = Object.assign({}, vars, { assetsBasePath: '../' });
    fs.writeFileSync(
      path.join(distDir, 'danke', 'index.html'),
      Handlebars.compile(thankSrc)(thankVars)
    );

    // Assets
    fs.copyFileSync(
      path.join(TEMPLATES, 'assets', 'css', 'funnel.css'),
      path.join(distDir, 'assets', 'css', 'funnel.css')
    );
    fs.copyFileSync(
      path.join(TEMPLATES, 'assets', 'js', 'funnel.js'),
      path.join(distDir, 'assets', 'js', 'funnel.js')
    );

    res.json({
      success: true,
      id: id,
      url: '/funnel/' + id + '/',
      thankYouUrl: '/funnel/' + id + '/danke/',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Domain-Einstellungen speichern
app.put('/api/funnels/:id/domain', function (req, res) {
  const configPath = path.join(FUNNELS_DIR, req.params.id, 'config.json');
  if (!fs.existsSync(configPath)) {
    return res.status(404).json({ error: 'Funnel nicht gefunden' });
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  config.customDomain = req.body.domain || '';
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  res.json({ success: true, domain: config.customDomain });
});

// Funnel löschen
app.delete('/api/funnels/:id', function (req, res) {
  const funnelDir = path.join(FUNNELS_DIR, req.params.id);
  if (!fs.existsSync(funnelDir)) {
    return res.status(404).json({ error: 'Funnel nicht gefunden' });
  }
  fs.rmSync(funnelDir, { recursive: true });
  res.json({ success: true });
});

// Lead-Eingang (Webhook-Ersatz)
app.post('/api/leads/:funnelId', function (req, res) {
  const funnelDir = path.join(FUNNELS_DIR, req.params.funnelId);
  if (!fs.existsSync(funnelDir)) {
    return res.status(404).json({ error: 'Funnel nicht gefunden' });
  }

  const leadsFile = path.join(funnelDir, 'leads.json');
  let leads = [];
  if (fs.existsSync(leadsFile)) {
    leads = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
  }

  const lead = Object.assign({}, req.body, {
    id: Date.now().toString(36),
    receivedAt: new Date().toISOString(),
  });
  leads.push(lead);
  fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2));

  res.json({ success: true, message: 'Lead erfolgreich erfasst' });
});

// Leads für einen Funnel abrufen
app.get('/api/leads/:funnelId', function (req, res) {
  const leadsFile = path.join(FUNNELS_DIR, req.params.funnelId, 'leads.json');
  if (!fs.existsSync(leadsFile)) {
    return res.json({ leads: [] });
  }
  const leads = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
  res.json({ leads: leads });
});

// ─── Funnel Hosting ─────────────────────────────────────────────────

// Generierte Funnels ausliefern
app.use('/funnel/:id', function (req, res, next) {
  const funnelDist = path.join(FUNNELS_DIR, req.params.id, 'dist');
  if (!fs.existsSync(funnelDist)) {
    return res.status(404).send('Funnel nicht gefunden');
  }
  express.static(funnelDist)(req, res, next);
});

// Custom Domain Routing
app.use(function (req, res, next) {
  const host = req.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return next();

  // Prüfe ob eine Domain auf einen Funnel zeigt
  if (fs.existsSync(FUNNELS_DIR)) {
    const dirs = fs.readdirSync(FUNNELS_DIR);
    for (var i = 0; i < dirs.length; i++) {
      var configPath = path.join(FUNNELS_DIR, dirs[i], 'config.json');
      if (fs.existsSync(configPath)) {
        var config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.customDomain && config.customDomain === host) {
          var distPath = path.join(FUNNELS_DIR, dirs[i], 'dist');
          return express.static(distPath)(req, res, next);
        }
      }
    }
  }
  next();
});

// ─── Start ──────────────────────────────────────────────────────────

app.listen(PORT, function () {
  console.log('');
  console.log('  Funnel Generator WebApp');
  console.log('  =======================');
  console.log('');
  console.log('  Dashboard:  http://localhost:' + PORT + '/dashboard');
  console.log('');
  console.log('  Bereit.');
  console.log('');
});
