#!/usr/bin/env node

/**
 * Workflow-Test-Script
 *
 * Testet die N8N Webhooks lokal, indem Beispiel-Daten gesendet werden.
 *
 * Verwendung:
 *   node scripts/test-workflow.js [webhook-url]
 */

require('dotenv').config();
const axios = require('axios');

const FUNNEL_WEBHOOK =
  process.argv[2] ||
  (process.env.N8N_BASE_URL || 'http://localhost:5678') + '/webhook/generate-funnel';

const LEAD_WEBHOOK =
  process.argv[3] ||
  (process.env.N8N_BASE_URL || 'http://localhost:5678') + '/webhook/lead-submit';

const sampleFunnelConfig = {
  companyName: 'Test GmbH',
  primaryColor: '#2563EB',
  secondaryColor: '#1E40AF',
  accentColor: '#F59E0B',
  headline: 'Kostenloses E-Book: 10 Tipps für mehr Erfolg',
  subheadline: 'Laden Sie jetzt unser E-Book herunter und steigern Sie Ihren Umsatz.',
  ctaText: 'E-Book herunterladen',
  downloadFileName: 'ebook-10-tipps.pdf',
  downloadFileUrl: 'https://example.com/downloads/ebook.pdf',
  customerEmail: 'test@example.com',
  conversionGoal: 0.06,
  benefits: [
    'Sofort umsetzbare Strategien',
    'Von Experten geschrieben',
    'Kostenlos und unverbindlich',
  ],
  formFields: [
    { name: 'firstName', label: 'Vorname', type: 'text', required: true, placeholder: 'Max' },
    {
      name: 'lastName',
      label: 'Nachname',
      type: 'text',
      required: true,
      placeholder: 'Mustermann',
    },
    {
      name: 'email',
      label: 'E-Mail',
      type: 'email',
      required: true,
      placeholder: 'max@example.de',
    },
  ],
};

const sampleLead = {
  firstName: 'Max',
  lastName: 'Mustermann',
  email: 'max.mustermann@example.de',
  phone: '+49 170 1234567',
  company: 'Musterfirma GmbH',
  submittedAt: new Date().toISOString(),
  source: 'http://localhost:3000/funnel',
};

async function testFunnelGeneration() {
  console.log('=== Test: Funnel-Generierung ===');
  console.log('Webhook:', FUNNEL_WEBHOOK);
  console.log('');

  try {
    const res = await axios.post(FUNNEL_WEBHOOK, sampleFunnelConfig, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    console.log('Status:', res.status);
    console.log('Antwort:', JSON.stringify(res.data, null, 2));
    console.log('ERFOLG\n');
    return true;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('N8N nicht erreichbar unter:', FUNNEL_WEBHOOK);
      console.log('Stellen Sie sicher, dass N8N läuft.\n');
    } else {
      console.log('FEHLER:', err.response ? err.response.data : err.message);
    }
    return false;
  }
}

async function testLeadSubmission() {
  console.log('=== Test: Lead-Übermittlung ===');
  console.log('Webhook:', LEAD_WEBHOOK);
  console.log('');

  try {
    const res = await axios.post(LEAD_WEBHOOK, sampleLead, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    console.log('Status:', res.status);
    console.log('Antwort:', JSON.stringify(res.data, null, 2));
    console.log('ERFOLG\n');
    return true;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('N8N nicht erreichbar unter:', LEAD_WEBHOOK);
      console.log('Stellen Sie sicher, dass N8N läuft.\n');
    } else {
      console.log('FEHLER:', err.response ? err.response.data : err.message);
    }
    return false;
  }
}

async function testLeadValidation() {
  console.log('=== Test: Lead-Validierung (ungültige Daten) ===');
  console.log('');

  const invalidLead = {
    firstName: '',
    lastName: '',
    email: 'keine-email',
  };

  try {
    const res = await axios.post(LEAD_WEBHOOK, invalidLead, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: function () {
        return true;
      },
    });
    console.log('Status:', res.status);
    console.log('Antwort:', JSON.stringify(res.data, null, 2));

    if (res.status === 400) {
      console.log('ERFOLG - Validierung hat ungültige Daten korrekt abgelehnt\n');
      return true;
    }
    console.log('WARNUNG - Erwartet: Status 400\n');
    return false;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('N8N nicht erreichbar. Test übersprungen.\n');
    } else {
      console.log('FEHLER:', err.message);
    }
    return false;
  }
}

async function runTests() {
  console.log('Funnel Generator - Workflow-Tests');
  console.log('=================================\n');

  const results = [];
  results.push(await testFunnelGeneration());
  results.push(await testLeadSubmission());
  results.push(await testLeadValidation());

  console.log('=================================');
  const passed = results.filter(Boolean).length;
  console.log('Ergebnis: ' + passed + '/' + results.length + ' Tests bestanden');

  if (passed < results.length) {
    console.log('\nHinweis: Fehlgeschlagene Tests können durch eine nicht laufende N8N-Instanz verursacht werden.');
    console.log('Starten Sie N8N und versuchen Sie es erneut.');
  }
}

runTests();
