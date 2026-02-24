#!/usr/bin/env node

/**
 * Funnel Generator Script
 *
 * Generiert einen vollständigen Lead-Funnel basierend auf der Konfiguration.
 * Nutzt Handlebars-Templates und erstellt statische HTML-Dateien.
 *
 * Verwendung:
 *   node scripts/generate-funnel.js [config-pfad]
 *
 * Ohne Argument wird config/funnel-config.json verwendet.
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const OUTPUT_DIR = path.join(ROOT, 'dist');

function loadConfig(configPath) {
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

function resolveVariables(config, overrides) {
  const merged = JSON.parse(JSON.stringify(config));
  const branding = merged.branding || {};
  const form = merged.leadForm || {};
  const download = merged.download || {};
  const notifications = merged.notifications || {};

  return {
    companyName: overrides.companyName || branding.companyName || 'Mein Unternehmen',
    primaryColor: overrides.primaryColor || branding.primaryColor || '#2563EB',
    secondaryColor: overrides.secondaryColor || branding.secondaryColor || '#1E40AF',
    accentColor: overrides.accentColor || branding.accentColor || '#F59E0B',
    logoUrl: overrides.logoUrl || branding.logoUrl || '',
    fontFamily: branding.fontFamily || 'Inter, sans-serif',
    headline: overrides.headline || 'Ihr kostenloses Angebot wartet',
    subheadline: overrides.subheadline || 'Tragen Sie Ihre Daten ein und erhalten Sie sofort Zugang.',
    ctaText: overrides.ctaText || form.submitButtonText || 'Jetzt herunterladen',
    formFields: overrides.formFields || form.fields || [],
    benefits: overrides.benefits || [
      'Sofortiger Zugang zum Download',
      'Kostenlos und unverbindlich',
      'Expertenwissen kompakt zusammengefasst',
    ],
    privacyUrl: overrides.privacyUrl || '#datenschutz',
    thankYouHeadline: overrides.thankYouHeadline || 'Vielen Dank!',
    thankYouText:
      overrides.thankYouText || 'Ihr Download steht bereit. Prüfen Sie auch Ihren Posteingang.',
    downloadFileName: overrides.downloadFileName || download.fileName || 'download.pdf',
    downloadFileUrl: overrides.downloadFileUrl || '',
    customerEmail: overrides.customerEmail || notifications.customerEmail || '',
    leadWebhookUrl: overrides.leadWebhookUrl || process.env.WEBHOOK_BASE_URL + '/lead-submit',
    currentYear: new Date().getFullYear(),
    // Metriken-basierte Einstellungen
    conversionGoal: overrides.conversionGoal || (merged.funnel && merged.funnel.metrics && merged.funnel.metrics.conversionGoal) || 0.05,
    showUrgency: false,
    showSocialProof: false,
    layoutMode: 'balanced',
    googleAnalyticsId: overrides.googleAnalyticsId || '',
    facebookPixelId: overrides.facebookPixelId || '',
  };
}

function applyMetricsOptimization(vars) {
  if (vars.conversionGoal > 0.08) {
    vars.layoutMode = 'aggressive';
    vars.showUrgency = true;
    vars.showSocialProof = true;
  } else if (vars.conversionGoal > 0.04) {
    vars.layoutMode = 'balanced';
    vars.showUrgency = false;
    vars.showSocialProof = true;
  } else {
    vars.layoutMode = 'minimal';
    vars.showUrgency = false;
    vars.showSocialProof = false;
  }
  return vars;
}

function compileTemplate(templatePath, data) {
  const source = fs.readFileSync(templatePath, 'utf-8');
  const template = Handlebars.compile(source);
  return template(data);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyAssets() {
  const srcCss = path.join(TEMPLATES_DIR, 'assets', 'css', 'funnel.css');
  const srcJs = path.join(TEMPLATES_DIR, 'assets', 'js', 'funnel.js');
  const destCss = path.join(OUTPUT_DIR, 'assets', 'css');
  const destJs = path.join(OUTPUT_DIR, 'assets', 'js');

  ensureDir(destCss);
  ensureDir(destJs);

  fs.copyFileSync(srcCss, path.join(destCss, 'funnel.css'));
  fs.copyFileSync(srcJs, path.join(destJs, 'funnel.js'));
}

function generate(configPath, overrides) {
  configPath = configPath || path.join(ROOT, 'config', 'funnel-config.json');
  overrides = overrides || {};

  console.log('Lade Konfiguration:', configPath);
  const config = loadConfig(configPath);

  let vars = resolveVariables(config, overrides);
  vars = applyMetricsOptimization(vars);

  console.log('Layout-Modus:', vars.layoutMode);
  console.log('Urgency:', vars.showUrgency);
  console.log('Social Proof:', vars.showSocialProof);

  // Output-Verzeichnis erstellen
  ensureDir(OUTPUT_DIR);

  // Landing Page generieren
  const landingTemplate = path.join(TEMPLATES_DIR, 'landing-page', 'index.hbs');
  const landingHtml = compileTemplate(landingTemplate, vars);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), landingHtml, 'utf-8');
  console.log('Landing Page generiert: dist/index.html');

  // Thank-You Page generieren
  const thankYouTemplate = path.join(TEMPLATES_DIR, 'thank-you-page', 'index.hbs');
  const thankYouHtml = compileTemplate(thankYouTemplate, vars);
  ensureDir(path.join(OUTPUT_DIR, 'danke'));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'danke', 'index.html'), thankYouHtml, 'utf-8');
  console.log('Thank-You Page generiert: dist/danke/index.html');

  // Assets kopieren
  copyAssets();
  console.log('Assets kopiert.');

  console.log('\nFunnel erfolgreich generiert!');
  console.log('Ausgabe-Verzeichnis:', OUTPUT_DIR);

  return {
    outputDir: OUTPUT_DIR,
    pages: ['index.html', 'danke/index.html'],
    layoutMode: vars.layoutMode,
    config: vars,
  };
}

// CLI-Modus
if (require.main === module) {
  const configArg = process.argv[2];
  const overridesArg = process.argv[3];
  let overrides = {};

  if (overridesArg) {
    try {
      overrides = JSON.parse(overridesArg);
    } catch (e) {
      console.error('Ungültiges JSON für Overrides:', e.message);
      process.exit(1);
    }
  }

  try {
    generate(configArg, overrides);
  } catch (err) {
    console.error('Fehler bei der Funnel-Generierung:', err.message);
    process.exit(1);
  }
}

module.exports = { generate };
