#!/usr/bin/env node

/**
 * Konfiguration-Validierungs-Script
 *
 * Prüft die funnel-config.json auf Vollständigkeit und Korrektheit.
 *
 * Verwendung:
 *   node scripts/validate-config.js [config-pfad]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function validateColor(color) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validate(configPath) {
  configPath = configPath || path.join(ROOT, 'config', 'funnel-config.json');

  if (!fs.existsSync(configPath)) {
    console.error('Konfigurationsdatei nicht gefunden:', configPath);
    return { valid: false, errors: ['Datei nicht gefunden'] };
  }

  let config;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(raw);
  } catch (e) {
    console.error('Ungültiges JSON:', e.message);
    return { valid: false, errors: ['Ungültiges JSON: ' + e.message] };
  }

  const errors = [];
  const warnings = [];

  // Funnel-Block
  if (!config.funnel) {
    errors.push('Block "funnel" fehlt');
  } else {
    if (!config.funnel.name) warnings.push('funnel.name ist leer');
    if (!config.funnel.pages || config.funnel.pages.length === 0) {
      errors.push('funnel.pages darf nicht leer sein');
    }
  }

  // Branding
  if (!config.branding) {
    warnings.push('Block "branding" fehlt - Standardwerte werden verwendet');
  } else {
    if (config.branding.primaryColor && !validateColor(config.branding.primaryColor)) {
      errors.push('branding.primaryColor ist kein gültiger Hex-Farbwert');
    }
    if (config.branding.secondaryColor && !validateColor(config.branding.secondaryColor)) {
      errors.push('branding.secondaryColor ist kein gültiger Hex-Farbwert');
    }
    if (config.branding.accentColor && !validateColor(config.branding.accentColor)) {
      errors.push('branding.accentColor ist kein gültiger Hex-Farbwert');
    }
  }

  // Lead-Formular
  if (!config.leadForm) {
    errors.push('Block "leadForm" fehlt');
  } else {
    if (!config.leadForm.fields || config.leadForm.fields.length === 0) {
      errors.push('leadForm.fields darf nicht leer sein');
    } else {
      const hasEmail = config.leadForm.fields.some(function (f) {
        return f.type === 'email';
      });
      if (!hasEmail) {
        errors.push('leadForm muss mindestens ein E-Mail-Feld enthalten');
      }

      config.leadForm.fields.forEach(function (field, i) {
        if (!field.name) errors.push('Feld ' + i + ': name fehlt');
        if (!field.label) errors.push('Feld ' + i + ': label fehlt');
        if (!field.type) errors.push('Feld ' + i + ': type fehlt');
      });
    }
  }

  // Notifications
  if (config.notifications) {
    if (
      config.notifications.sendToCustomer &&
      config.notifications.customerEmail &&
      !config.notifications.customerEmail.startsWith('{{') &&
      !validateEmail(config.notifications.customerEmail)
    ) {
      errors.push('notifications.customerEmail ist keine gültige E-Mail');
    }
  }

  // Metriken
  if (config.funnel && config.funnel.metrics) {
    const m = config.funnel.metrics;
    if (m.conversionGoal !== undefined && (m.conversionGoal < 0 || m.conversionGoal > 1)) {
      errors.push('funnel.metrics.conversionGoal muss zwischen 0 und 1 liegen');
    }
    if (m.bounceRateThreshold !== undefined && (m.bounceRateThreshold < 0 || m.bounceRateThreshold > 1)) {
      errors.push('funnel.metrics.bounceRateThreshold muss zwischen 0 und 1 liegen');
    }
  }

  // Ergebnis
  const valid = errors.length === 0;

  console.log('Validierung: ' + configPath);
  console.log('---');

  if (errors.length > 0) {
    console.log('FEHLER (' + errors.length + '):');
    errors.forEach(function (e) {
      console.log('  - ' + e);
    });
  }

  if (warnings.length > 0) {
    console.log('WARNUNGEN (' + warnings.length + '):');
    warnings.forEach(function (w) {
      console.log('  - ' + w);
    });
  }

  if (valid && warnings.length === 0) {
    console.log('Konfiguration ist vollständig und korrekt.');
  } else if (valid) {
    console.log('\nKonfiguration ist gültig (mit Warnungen).');
  } else {
    console.log('\nKonfiguration ist UNGÜLTIG. Bitte Fehler beheben.');
  }

  return { valid: valid, errors: errors, warnings: warnings };
}

if (require.main === module) {
  const result = validate(process.argv[2]);
  process.exit(result.valid ? 0 : 1);
}

module.exports = { validate };
