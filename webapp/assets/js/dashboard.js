/**
 * Dashboard - Client-seitiges JavaScript
 */
(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────
  var previewTimer = null;
  var defaultFields = [
    { name: 'firstName', label: 'Vorname', type: 'text', required: true, placeholder: 'Ihr Vorname' },
    { name: 'lastName', label: 'Nachname', type: 'text', required: true, placeholder: 'Ihr Nachname' },
    { name: 'email', label: 'E-Mail-Adresse', type: 'email', required: true, placeholder: 'ihre@email.de' },
    { name: 'phone', label: 'Telefonnummer', type: 'tel', required: false, placeholder: '+49 123 456789' },
    { name: 'company', label: 'Unternehmen', type: 'text', required: false, placeholder: 'Ihr Unternehmen' },
  ];

  // ─── Init ────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initTabs();
    initColorSync();
    initConversionSlider();
    initDeviceButtons();
    initFormFieldsEditor();
    initSaveButton();
    initDomainSave();
    schedulePreview();
    loadFunnels();
  });

  // ─── Navigation ──────────────────────────────────────────
  function initNav() {
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        var view = this.getAttribute('data-view');
        showView(view);
      });
    });
  }

  window.showView = function (viewName) {
    document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });

    var navEl = document.querySelector('[data-view="' + viewName + '"]');
    var viewEl = document.getElementById('view-' + viewName);
    if (navEl) navEl.classList.add('active');
    if (viewEl) viewEl.classList.add('active');

    if (viewName === 'funnels') loadFunnels();
    if (viewName === 'leads') loadFunnelSelects();
    if (viewName === 'domains') loadFunnelSelects();
  };

  // ─── Tabs ────────────────────────────────────────────────
  function initTabs() {
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById(this.getAttribute('data-tab')).classList.add('active');
      });
    });
  }

  // ─── Color Sync ──────────────────────────────────────────
  function initColorSync() {
    ['primary', 'secondary', 'accent'].forEach(function (name) {
      var picker = document.getElementById('cfg-' + name + 'Color');
      var text = document.getElementById('cfg-' + name + 'ColorText');

      picker.addEventListener('input', function () {
        text.value = this.value.toUpperCase();
        schedulePreview();
      });
      text.addEventListener('input', function () {
        if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
          picker.value = this.value;
          schedulePreview();
        }
      });
    });
  }

  // ─── Conversion Slider ───────────────────────────────────
  function initConversionSlider() {
    var slider = document.getElementById('cfg-conversionGoal');
    var display = document.getElementById('conversionDisplay');
    var info = document.getElementById('metricsInfo');

    slider.addEventListener('input', function () {
      var val = parseFloat(this.value);
      display.textContent = Math.round(val * 100) + '%';

      var mode, desc;
      if (val > 0.08) {
        mode = 'aggressive';
        desc = 'Urgency-Banner + Social Proof. Maximale Conversion-Optimierung.';
      } else if (val > 0.04) {
        mode = 'balanced';
        desc = 'Social Proof wird angezeigt. Kein Urgency-Banner.';
      } else {
        mode = 'minimal';
        desc = 'Cleanes Layout ohne Social Proof oder Urgency-Elemente.';
      }

      info.innerHTML =
        '<div class="metrics-badge ' + mode + '">' +
        mode.charAt(0).toUpperCase() + mode.slice(1) +
        '</div><p>' + desc + '</p>';
      schedulePreview();
    });
  }

  // ─── Device Buttons ──────────────────────────────────────
  function initDeviceButtons() {
    document.querySelectorAll('.device-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.device-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');

        var device = this.getAttribute('data-device');
        var frame = document.getElementById('previewFrame');
        frame.className = 'preview-frame device-' + device;
      });
    });
  }

  // ─── Form Fields Editor ──────────────────────────────────
  function initFormFieldsEditor() {
    renderFormFields(defaultFields);

    document.getElementById('addFieldBtn').addEventListener('click', function () {
      var fields = collectFormFields();
      fields.push({ name: 'field' + Date.now(), label: 'Neues Feld', type: 'text', required: false, placeholder: '' });
      renderFormFields(fields);
      schedulePreview();
    });
  }

  function renderFormFields(fields) {
    var list = document.getElementById('form-fields-list');
    list.innerHTML = '';

    fields.forEach(function (field, i) {
      var el = document.createElement('div');
      el.className = 'form-field-item';
      el.innerHTML =
        '<div><label>Label</label><input type="text" class="ff-label" value="' + escapeHtml(field.label) + '"></div>' +
        '<div><label>Typ</label><select class="ff-type">' +
          '<option value="text"' + (field.type === 'text' ? ' selected' : '') + '>Text</option>' +
          '<option value="email"' + (field.type === 'email' ? ' selected' : '') + '>E-Mail</option>' +
          '<option value="tel"' + (field.type === 'tel' ? ' selected' : '') + '>Telefon</option>' +
          '<option value="number"' + (field.type === 'number' ? ' selected' : '') + '>Nummer</option>' +
          '<option value="url"' + (field.type === 'url' ? ' selected' : '') + '>URL</option>' +
        '</select></div>' +
        '<label class="field-required-toggle"><input type="checkbox" class="ff-required"' + (field.required ? ' checked' : '') + '>Pflicht</label>' +
        '<button class="field-delete" title="Entfernen">&times;</button>';

      el.querySelector('.field-delete').addEventListener('click', function () {
        el.remove();
        schedulePreview();
      });

      el.querySelectorAll('input, select').forEach(function (inp) {
        inp.addEventListener('change', function () { schedulePreview(); });
      });

      list.appendChild(el);
    });
  }

  function collectFormFields() {
    var items = document.querySelectorAll('.form-field-item');
    var fields = [];
    items.forEach(function (item) {
      var label = item.querySelector('.ff-label').value;
      var type = item.querySelector('.ff-type').value;
      var required = item.querySelector('.ff-required').checked;
      fields.push({
        name: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_$/,''),
        label: label,
        type: type,
        required: required,
        placeholder: '',
      });
    });
    return fields;
  }

  // ─── Config ──────────────────────────────────────────────
  function collectConfig() {
    return {
      companyName: document.getElementById('cfg-companyName').value,
      headline: document.getElementById('cfg-headline').value,
      subheadline: document.getElementById('cfg-subheadline').value,
      ctaText: document.getElementById('cfg-ctaText').value,
      benefits: document.getElementById('cfg-benefits').value.split('\n').filter(Boolean),
      logoUrl: document.getElementById('cfg-logoUrl').value,
      primaryColor: document.getElementById('cfg-primaryColor').value,
      secondaryColor: document.getElementById('cfg-secondaryColor').value,
      accentColor: document.getElementById('cfg-accentColor').value,
      thankYouHeadline: document.getElementById('cfg-thankYouHeadline').value,
      thankYouText: document.getElementById('cfg-thankYouText').value,
      conversionGoal: parseFloat(document.getElementById('cfg-conversionGoal').value),
      customerEmail: document.getElementById('cfg-customerEmail').value,
      leadWebhookUrl: document.getElementById('cfg-leadWebhookUrl').value,
      downloadFileName: document.getElementById('cfg-downloadFileName').value,
      downloadFileUrl: document.getElementById('cfg-downloadFileUrl').value,
      privacyUrl: document.getElementById('cfg-privacyUrl').value,
      formFields: collectFormFields(),
    };
  }

  // ─── Preview ─────────────────────────────────────────────
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 400);
  }

  function updatePreview() {
    var config = collectConfig();

    fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.html) {
          var frame = document.getElementById('previewFrame');
          var doc = frame.contentDocument || frame.contentWindow.document;
          doc.open();
          doc.write(data.html);
          doc.close();

          // Formulare in Preview deaktivieren
          setTimeout(function () {
            try {
              var forms = frame.contentDocument.querySelectorAll('form');
              forms.forEach(function (f) {
                f.addEventListener('submit', function (e) { e.preventDefault(); });
              });
            } catch (e) { /* cross-origin silently ignored */ }
          }, 100);
        }
      })
      .catch(function (err) {
        console.error('Preview error:', err);
      });
  }

  // Trigger preview on any input change
  document.addEventListener('input', function (e) {
    if (e.target.closest('.editor-panel') && !e.target.closest('.form-field-item')) {
      schedulePreview();
    }
  });

  // ─── Save ────────────────────────────────────────────────
  function initSaveButton() {
    document.getElementById('saveBtn').addEventListener('click', function () {
      var btn = this;
      btn.disabled = true;
      btn.textContent = 'Wird generiert...';

      var config = collectConfig();

      fetch('/api/funnels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success) {
            showToast('Funnel erstellt! URL: ' + data.url, 'success');
          } else {
            showToast('Fehler: ' + (data.error || 'Unbekannt'), 'error');
          }
        })
        .catch(function (err) {
          showToast('Fehler: ' + err.message, 'error');
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' +
            'Funnel speichern &amp; generieren';
        });
    });
  }

  // ─── Load Funnels ────────────────────────────────────────
  function loadFunnels() {
    fetch('/api/funnels')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var grid = document.getElementById('funnelGrid');
        var empty = document.getElementById('emptyFunnels');

        if (!data.funnels || data.funnels.length === 0) {
          grid.innerHTML = '';
          grid.appendChild(empty);
          empty.style.display = '';
          return;
        }

        grid.innerHTML = '';
        data.funnels.forEach(function (f) {
          var card = document.createElement('div');
          card.className = 'funnel-card';
          card.innerHTML =
            '<div class="funnel-card-header">' +
              '<div><h3>' + escapeHtml(f.name) + '</h3>' +
              '<span class="funnel-date">' + (f.createdAt ? new Date(f.createdAt).toLocaleDateString('de-DE') : '') + '</span></div>' +
            '</div>' +
            '<p class="funnel-headline">' + escapeHtml(f.headline || 'Kein Titel') + '</p>' +
            (f.domain ? '<p class="funnel-headline">Domain: ' + escapeHtml(f.domain) + '</p>' : '') +
            '<div class="funnel-card-actions">' +
              '<a href="/funnel/' + f.id + '/" target="_blank" class="funnel-link">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
                'Öffnen' +
              '</a>' +
              '<button class="btn btn-danger btn-sm" onclick="deleteFunnel(\'' + f.id + '\')">Löschen</button>' +
            '</div>';
          grid.appendChild(card);
        });
      });
  }

  window.deleteFunnel = function (id) {
    if (!confirm('Funnel wirklich löschen?')) return;
    fetch('/api/funnels/' + id, { method: 'DELETE' })
      .then(function () {
        showToast('Funnel gelöscht', 'success');
        loadFunnels();
      });
  };

  // ─── Leads ───────────────────────────────────────────────
  function loadFunnelSelects() {
    fetch('/api/funnels')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        ['leadsFunnelSelect', 'domainFunnelSelect'].forEach(function (selId) {
          var sel = document.getElementById(selId);
          if (!sel) return;
          var current = sel.value;
          sel.innerHTML = '<option value="">Funnel auswählen...</option>';
          (data.funnels || []).forEach(function (f) {
            var opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.name;
            sel.appendChild(opt);
          });
          if (current) sel.value = current;
        });
      });

    var leadsSel = document.getElementById('leadsFunnelSelect');
    // Remove old listener by cloning
    var newSel = leadsSel.cloneNode(true);
    leadsSel.parentNode.replaceChild(newSel, leadsSel);
    newSel.addEventListener('change', function () {
      if (!this.value) return;
      loadLeads(this.value);
    });
  }

  function loadLeads(funnelId) {
    fetch('/api/leads/' + funnelId)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var container = document.getElementById('leadsContainer');
        if (!data.leads || data.leads.length === 0) {
          container.innerHTML =
            '<div class="empty-state">' +
              '<h3>Noch keine Leads</h3>' +
              '<p>Leads erscheinen hier, sobald das Formular ausgefüllt wird.</p>' +
            '</div>';
          return;
        }

        var html = '<div class="leads-table-wrapper"><table class="leads-table"><thead><tr>' +
          '<th>Name</th><th>E-Mail</th><th>Telefon</th><th>Unternehmen</th><th>Datum</th>' +
          '</tr></thead><tbody>';

        data.leads.forEach(function (l) {
          html += '<tr>' +
            '<td>' + escapeHtml((l.firstName || '') + ' ' + (l.lastName || '')) + '</td>' +
            '<td>' + escapeHtml(l.email || '') + '</td>' +
            '<td>' + escapeHtml(l.phone || '-') + '</td>' +
            '<td>' + escapeHtml(l.company || '-') + '</td>' +
            '<td>' + (l.receivedAt ? new Date(l.receivedAt).toLocaleString('de-DE') : '') + '</td>' +
            '</tr>';
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
      });
  }

  // ─── Domains ─────────────────────────────────────────────
  function initDomainSave() {
    document.getElementById('saveDomainBtn').addEventListener('click', function () {
      var funnelId = document.getElementById('domainFunnelSelect').value;
      var domain = document.getElementById('domainInput').value.trim();

      if (!funnelId) { showToast('Bitte einen Funnel auswählen', 'error'); return; }
      if (!domain) { showToast('Bitte eine Domain eingeben', 'error'); return; }

      fetch('/api/funnels/' + funnelId + '/domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success) {
            showToast('Domain ' + domain + ' verbunden!', 'success');
          } else {
            showToast('Fehler: ' + (data.error || 'Unbekannt'), 'error');
          }
        });
    });
  }

  // ─── Toast ───────────────────────────────────────────────
  function showToast(msg, type) {
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || '');
    toast.textContent = msg;
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function () { toast.remove(); }, 300);
    }, 4000);
  }
  window.showToast = showToast;

  // ─── Helpers ─────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
