# Funnel Generator Automation

Automatisierte Generierung von Lead-Funnels (Webseiten) über N8N-Workflows mit Webflow-Integration.

## Überblick

Diese Automation ermöglicht es, basierend auf einfachen Metriken und Konfigurationsparametern einen vollständigen Lead-Funnel zu generieren:

1. **Landing Page** – Nutzer tragen ihre Daten in ein Formular ein
2. **Datei-Download** – Nach Absenden erhält der Nutzer eine Datei zum Herunterladen
3. **Lead-Weiterleitung** – Die Daten werden automatisch per E-Mail an den Kunden gesendet und in Webflow CMS gespeichert

## Architektur

```
┌─────────────────┐    ┌──────────────────┐    ┌───────────────┐
│  Konfiguration   │───▶│  N8N Workflow 1   │───▶│  Webflow API  │
│  (JSON + Metriken)│    │  Funnel generieren│    │  Seite anlegen│
└─────────────────┘    └──────────────────┘    └───────────────┘
                                                         │
                                                         ▼
                       ┌──────────────────┐    ┌───────────────┐
                       │  N8N Workflow 2   │◀──│  Landing Page  │
                       │  Lead verarbeiten │    │  (Formular)   │
                       └──────────────────┘    └───────────────┘
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
              ┌──────────┐ ┌────────┐ ┌──────────┐
              │ Webflow   │ │ E-Mail │ │ E-Mail   │
              │ CMS Lead  │ │ Kunde  │ │ Lead     │
              │ speichern │ │ notify │ │ confirm  │
              └──────────┘ └────────┘ └──────────┘
```

## Setup

### Voraussetzungen

- Node.js >= 18
- N8N-Instanz (self-hosted oder Cloud)
- Webflow-Account mit API-Zugang
- SMTP-Zugang für E-Mail-Versand

### Installation

```bash
# Repository klonen
git clone <repo-url>
cd funnel-generator-automation

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env
# .env-Datei mit eigenen Werten befüllen
```

### N8N Workflows importieren

1. N8N öffnen
2. **Einstellungen → Import Workflow**
3. `n8n-workflows/funnel-generator-workflow.json` importieren
4. `n8n-workflows/lead-processing-workflow.json` importieren
5. Credentials einrichten:
   - **Webflow API**: API-Token aus Webflow Dashboard
   - **SMTP**: E-Mail-Server Zugangsdaten
6. Workflows aktivieren

### Webflow vorbereiten

1. In Webflow eine neue **CMS Collection** "Leads" erstellen mit den Feldern:
   - `name` (Text)
   - `email` (Email)
   - `phone` (Phone)
   - `company` (Text)
   - `submitted-at` (Date)
   - `source` (Text)
2. Collection-ID in `.env` als `WEBFLOW_COLLECTION_ID` eintragen

## Verwendung

### Funnel lokal generieren

```bash
# Standard-Konfiguration verwenden
npm run generate-funnel

# Mit eigener Konfiguration
node scripts/generate-funnel.js pfad/zur/config.json

# Mit Overrides
node scripts/generate-funnel.js config/funnel-config.json '{"companyName":"Test GmbH","headline":"Mein Titel"}'
```

Die generierten Dateien liegen anschließend im `dist/`-Verzeichnis.

### Funnel zu Webflow deployen

```bash
npm run deploy
```

### Per N8N Webhook generieren

Einen POST-Request an den N8N Webhook senden:

```bash
curl -X POST https://ihre-n8n-instanz.com/webhook/generate-funnel \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Meine Firma GmbH",
    "headline": "Kostenloses E-Book herunterladen",
    "subheadline": "10 Strategien für mehr Umsatz",
    "ctaText": "Jetzt E-Book sichern",
    "primaryColor": "#2563EB",
    "downloadFileName": "ebook.pdf",
    "downloadFileUrl": "https://example.com/ebook.pdf",
    "customerEmail": "kunde@example.com",
    "conversionGoal": 0.06,
    "benefits": [
      "Sofort umsetzbar",
      "Von Experten geschrieben",
      "100% kostenlos"
    ]
  }'
```

### Konfiguration validieren

```bash
npm run validate
```

### Workflows testen

```bash
npm run test
```

## Metriken-basierte Optimierung

Das System passt das Layout automatisch anhand des `conversionGoal` Werts an:

| Conversion-Ziel | Layout-Modus | Urgency-Banner | Social Proof |
|-----------------|-------------|----------------|--------------|
| > 8%            | aggressive  | Ja             | Ja           |
| 4-8%            | balanced    | Nein           | Ja           |
| < 4%            | minimal     | Nein           | Nein         |

## Konfiguration

Die Datei `config/funnel-config.json` steuert alle Aspekte des Funnels:

- **funnel.metrics** – Conversion-Ziele und Schwellenwerte
- **branding** – Farben, Logo, Schriftart
- **leadForm.fields** – Formularfelder (Name, Typ, Pflichtfeld)
- **download** – Download-Datei und Beschreibung
- **notifications** – E-Mail-Benachrichtigungen
- **tracking** – Google Analytics, Facebook Pixel

## Projektstruktur

```
├── config/
│   └── funnel-config.json       # Hauptkonfiguration
├── n8n-workflows/
│   ├── funnel-generator-workflow.json  # Workflow 1: Funnel erstellen
│   └── lead-processing-workflow.json   # Workflow 2: Leads verarbeiten
├── templates/
│   ├── landing-page/
│   │   └── index.hbs            # Landing-Page-Template
│   ├── thank-you-page/
│   │   └── index.hbs            # Danke-Seite-Template
│   └── assets/
│       ├── css/funnel.css       # Gemeinsames Stylesheet
│       └── js/funnel.js         # Client-seitiges JavaScript
├── scripts/
│   ├── generate-funnel.js       # Funnel lokal generieren
│   ├── deploy-to-webflow.js     # Zu Webflow deployen
│   ├── validate-config.js       # Konfiguration prüfen
│   └── test-workflow.js         # Workflows testen
├── dist/                        # Generierte Ausgabe (gitignored)
├── .env.example                 # Umgebungsvariablen-Vorlage
└── package.json
```

## Seite im Webflow Editor bearbeiten

Nach dem Deployment ist die Funnel-Seite direkt im **Webflow Designer** bearbeitbar:

1. Webflow Designer öffnen
2. Zur Funnel-Seite navigieren (Slug: `/funnel`)
3. Texte, Farben und Layout visuell anpassen
4. Änderungen veröffentlichen

Der Vorteil: Die Seite wird initial automatisch generiert, kann aber jederzeit im Webflow-Tool visuell nachbearbeitet werden.
