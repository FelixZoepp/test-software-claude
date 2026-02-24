/**
 * Funnel App - Client-seitiges JavaScript für Lead-Formulare
 *
 * Verantwortlich für:
 * - Formular-Validierung
 * - Lead-Daten an N8N Webhook senden
 * - Download-Link bereitstellen
 * - Event-Tracking (GA, Facebook Pixel)
 */
const FunnelApp = (function () {
  let config = {
    webhookUrl: '',
    downloadUrl: '',
    ctaText: 'Jetzt herunterladen',
  };

  function trackEvent(eventName) {
    if (typeof gtag === 'function') {
      gtag('event', eventName);
    }
    if (typeof fbq === 'function') {
      fbq('track', eventName);
    }
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateForm(form) {
    let valid = true;
    const inputs = form.querySelectorAll('.form-input[required]');

    inputs.forEach(function (input) {
      input.classList.remove('error');
      const errorEl = input.parentElement.querySelector('.field-error');
      if (errorEl) errorEl.style.display = 'none';

      if (!input.value.trim()) {
        valid = false;
        input.classList.add('error');
        if (errorEl) {
          errorEl.textContent = 'Dieses Feld ist erforderlich.';
          errorEl.style.display = 'block';
        }
      } else if (input.type === 'email' && !validateEmail(input.value)) {
        valid = false;
        input.classList.add('error');
        if (errorEl) {
          errorEl.textContent = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
          errorEl.style.display = 'block';
        }
      }
    });

    const privacy = form.querySelector('#privacy');
    if (privacy && !privacy.checked) {
      valid = false;
      alert('Bitte stimmen Sie der Datenschutzerklärung zu.');
    }

    return valid;
  }

  function collectFormData(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach(function (value, key) {
      if (key !== 'privacy') {
        data[key] = value;
      }
    });
    data.submittedAt = new Date().toISOString();
    data.source = window.location.href;
    return data;
  }

  async function submitLead(data) {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Submission failed: ' + response.status);
    }

    return response.json();
  }

  function showSuccess() {
    const form = document.getElementById('leadForm');
    const success = document.getElementById('formSuccess');
    const downloadLink = document.getElementById('downloadLink');

    if (form) form.style.display = 'none';

    const heading = document.querySelector('.form-card h3');
    if (heading) heading.style.display = 'none';

    const subtitle = document.querySelector('.form-subtitle');
    if (subtitle) subtitle.style.display = 'none';

    if (downloadLink) {
      downloadLink.href = config.downloadUrl;
      downloadLink.addEventListener('click', function () {
        trackEvent('download_click');
      });
    }

    if (success) success.classList.add('visible');
  }

  function init(options) {
    config = Object.assign(config, options);

    trackEvent('page_view');

    const form = document.getElementById('leadForm');
    if (!form) return;

    // Track erstes Feld-Focus
    let formStarted = false;
    form.querySelectorAll('.form-input').forEach(function (input) {
      input.addEventListener('focus', function () {
        if (!formStarted) {
          formStarted = true;
          trackEvent('form_start');
        }
      });
    });

    // Formular-Submit
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!validateForm(form)) return;

      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span>Wird gesendet...';

      try {
        const data = collectFormData(form);
        await submitLead(data);
        trackEvent('form_submit');
        showSuccess();
      } catch (err) {
        console.error('Submit error:', err);
        alert('Es gab einen Fehler. Bitte versuchen Sie es erneut.');
        submitBtn.disabled = false;
        submitBtn.textContent = config.ctaText;
      }
    });
  }

  return { init: init };
})();
