(function () {
  const MODEL_STORAGE_KEY = 'ocfast_flash_models_v1';

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function toast(message) {
    const el = document.getElementById('toast') || document.createElement('div');
    if (!document.getElementById('toast')) {
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._toastTimer);
    el._toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function readModels() {
    return safeParse(localStorage.getItem(MODEL_STORAGE_KEY), {});
  }

  function writeModels(models) {
    localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(models));
  }

  function getCurrentModelName() {
    const selectors = ['#modelName', '#flashModelName', '#smartModelName', 'input[name="modelName"]', 'input[name="flashModelName"]'];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.value && el.value.trim()) return el.value.trim();
    }
    return '';
  }

  function getModelTemplateText() {
    const selectors = ['#modelTemplate', '#flashModelTemplate', '#smartTemplate', 'textarea[name="modelTemplate"]', 'textarea[name="template"]'];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && typeof el.value === 'string' && el.value.trim()) return el.value;
    }
    return '';
  }

  function collectFormValues() {
    const data = {};
    const fields = document.querySelectorAll('input, textarea, select');

    fields.forEach((field) => {
      if (field.disabled || field.type === 'button' || field.type === 'submit' || field.type === 'reset') return;
      const key = field.id || field.name;
      if (!key) return;
      if (field.type === 'checkbox' || field.type === 'radio') {
        data[key] = field.checked;
      } else {
        data[key] = field.value;
      }
    });

    return data;
  }

  function saveModel() {
    const models = readModels();
    const name = getCurrentModelName();
    const payload = collectFormValues();
    const text = getModelTemplateText();

    if (!name) {
      toast('Informe um nome para salvar o modelo.');
      const focusTarget = document.querySelector('#modelName, #flashModelName, #smartModelName');
      if (focusTarget) focusTarget.focus();
      return;
    }

    models[name] = {
      name,
      text,
      payload,
      updatedAt: new Date().toISOString()
    };

    writeModels(models);
    renderSavedModels();
    toast('Modelo salvo com sucesso.');
  }

  function deleteModel(name) {
    const models = readModels();
    if (!models[name]) return;
    if (!confirm('Excluir o modelo "' + name + '"?')) return;
    delete models[name];
    writeModels(models);
    renderSavedModels();
    toast('Modelo excluído.');
  }

  function renameModel(oldName, nextName) {
    const models = readModels();
    if (!models[oldName] || !nextName) return;
    const item = models[oldName];
    delete models[oldName];
    models[nextName.trim()] = { ...item, name: nextName.trim(), updatedAt: new Date().toISOString() };
    writeModels(models);
    renderSavedModels();
    toast('Modelo renomeado.');
  }

  function loadModel(name) {
    const models = readModels();
    const data = models[name];
    if (!data) {
      toast('Modelo não encontrado.');
      return;
    }

    const currentValues = Object.values(collectFormValues());
    const hasFilledData = currentValues.some((value) => value !== '' && value !== false && value !== null && value !== undefined);

    if (hasFilledData && !confirm('Já existem dados preenchidos. Deseja substituir pelo modelo salvo?')) {
      return;
    }

    Object.entries(data.payload || {}).forEach(([key, value]) => {
      const field = document.getElementById(key) || document.querySelector('[name="' + key + '"]');
      if (!field) return;
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = !!value;
      } else {
        field.value = value ?? '';
      }
    });

    const templateField = document.querySelector('#modelTemplate, #flashModelTemplate, #smartTemplate, textarea[name="modelTemplate"], textarea[name="template"]');
    if (templateField && data.text) {
      templateField.value = data.text;
    }

    toast('Modelo carregado.');
  }

  function renderSavedModels() {
    const models = readModels();
    const listElement = document.getElementById('savedFlashModels') || document.getElementById('savedModelsList');
    if (!listElement) return;

    listElement.innerHTML = '';
    const names = Object.keys(models);

    if (!names.length) {
      listElement.innerHTML = '<div class="modelEmpty">Nenhum modelo salvo.</div>';
      return;
    }

    names.forEach((name) => {
      const row = document.createElement('div');
      row.className = 'catalogItem';
      row.style.display = 'flex';
      row.style.gap = '6px';
      row.style.alignItems = 'center';
      row.style.marginBottom = '6px';
      row.innerHTML = [
        '<button type="button" class="btn full" data-model-load="' + name + '">' + name + '</button>',
        '<button type="button" class="btn" data-model-rename="' + name + '">REN</button>',
        '<button type="button" class="btn danger" data-model-delete="' + name + '">DEL</button>'
      ].join('');
      listElement.appendChild(row);
    });

    listElement.querySelectorAll('[data-model-load]').forEach((button) => {
      button.addEventListener('click', () => loadModel(button.dataset.modelLoad));
    });

    listElement.querySelectorAll('[data-model-delete]').forEach((button) => {
      button.addEventListener('click', () => deleteModel(button.dataset.modelDelete));
    });

    listElement.querySelectorAll('[data-model-rename]').forEach((button) => {
      button.addEventListener('click', () => {
        const oldName = button.dataset.modelRename;
        const nextName = window.prompt('Renomear modelo para:', oldName);
        if (nextName && nextName.trim()) renameModel(oldName, nextName.trim());
      });
    });
  }

  function ensureModelCatalog() {
    const existing = document.getElementById('savedFlashModels');
    if (existing) {
      renderSavedModels();
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'savedFlashModels';
    panel.className = 'catalogBox';
    panel.innerHTML = '<div class="catalogTitle">Modelos salvos</div><div id="savedModelsList"></div>';

    const target = document.querySelector('.modelForm, .flashBody .modelForm, .flashBody');
    if (target) {
      target.appendChild(panel);
    }

    renderSavedModels();
  }

  function bindModelActions() {
    const saveSelectors = ['#saveModelEditor', '#saveModelBtn', '#saveFlashModel', '#saveCurrentModel', 'button[data-action="save-model"]'];
    saveSelectors.forEach((selector) => {
      const button = document.querySelector(selector);
      if (button) {
        button.removeEventListener('click', saveModel);
        button.addEventListener('click', saveModel);
      }
    });

    const loadSelectors = ['#loadSavedModels', '#loadModelBtn', '#loadFlashModel'];
    loadSelectors.forEach((selector) => {
      const button = document.querySelector(selector);
      if (button) {
        button.removeEventListener('click', renderSavedModels);
        button.addEventListener('click', renderSavedModels);
      }
    });

    ['#modelName', '#flashModelName', '#smartModelName'].forEach((selector) => {
      const field = document.querySelector(selector);
      if (!field) return;
      field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          saveModel();
        }
      });
    });
  }

  function getFocusableItems() {
    return Array.from(document.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
  }

  function focusNextLogicalField(currentElement) {
    const candidates = getFocusableItems();
    const index = candidates.indexOf(currentElement);
    const next = candidates[index + 1];

    if (next) {
      next.focus();
      if (next.tagName === 'SELECT') {
        next.click();
      }
      return;
    }

    if (currentElement.closest('form')) {
      currentElement.closest('form').requestSubmit?.();
    }
  }

  function bindEnterNavigation() {
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!target || !target.matches('input, select, textarea')) return;
      if (target.matches('select, textarea')) return;
      if (target.matches('input[type="checkbox"], input[type="radio"], input[type="button"], input[type="submit"], input[type="reset"]')) return;
      if (target.closest('.modal.show, .flashModal.show')) return;

      const isSpecialInput = target.matches('input[type="time"], input[type="date"], input[type="datetime-local"]');
      if (isSpecialInput || target.matches('input[type="text"], input[type="number"], input[type="email"], input[type="tel"], input[type="search"]')) {
        event.preventDefault();
        focusNextLogicalField(target);
      }
    });
  }

  function fixQuickTimeSelector() {
    const timePickers = document.querySelectorAll('.quickTimePicker select, input[type="time"]');
    timePickers.forEach((element) => {
      element.style.minHeight = '42px';
      element.style.width = '100%';
      element.style.borderRadius = '9px';
      element.style.border = '1px solid rgba(255,255,255,.14)';
      element.style.background = '#111';
      element.style.color = '#f2f2f2';
      element.style.padding = '8px 9px';
      element.style.fontSize = '16px';
      element.style.fontWeight = '800';
      element.style.outline = 'none';
      element.style.boxSizing = 'border-box';
    });

    const pickerGroups = document.querySelectorAll('.quickTimePicker');
    pickerGroups.forEach((group) => {
      group.style.display = 'grid';
      group.style.gridTemplateColumns = '1fr 1fr';
      group.style.gap = '6px';
      group.style.minWidth = '0';
      group.style.flex = '1';
    });

    if (window.matchMedia('(max-width: 700px)').matches) {
      timePickers.forEach((element) => {
        element.style.minHeight = '42px';
        element.style.fontSize = '17px';
      });
    }
  }

  function initCompatLayer() {
    fixQuickTimeSelector();
    bindEnterNavigation();
    bindModelActions();
    ensureModelCatalog();

    window.ocFastCompat = {
      saveModel,
      loadModel,
      deleteModel,
      renameModel,
      renderSavedModels,
      readModels
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompatLayer, { once: true });
  } else {
    initCompatLayer();
  }
})();
