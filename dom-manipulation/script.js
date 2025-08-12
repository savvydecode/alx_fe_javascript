(() => {
  const STORAGE_KEY_QUOTES = 'dqg_quotes';
  const STORAGE_KEY_SELECTED_CATEGORY = 'dqg_selected_category';
  const SESSION_KEY_LAST_QUOTE = 'dqg_last_quote';
  const SERVER_ENDPOINT = 'https://jsonplaceholder.typicode.com/posts';
  const SYNC_INTERVAL_MS = 15000;

  let quotes = [];

  let conflicts = [];

  const quoteDisplay = document.getElementById('quoteDisplay');
  const newQuoteBtn = document.getElementById('newQuote');

  // Create the add-quote form if it's not already present in HTML
  function createAddQuoteForm() {
    let formContainer = document.getElementById('addQuoteContainer');

    const existingText = document.getElementById('newQuoteText');
    const existingCat = document.getElementById('newQuoteCategory');
    const existingButton = Array.from(document.getElementsByTagName('button'))
      .find(b => b.getAttribute('onclick') === 'addQuote()');

    // If the inputs already exist in HTML, do nothing
    if (existingText && existingCat && existingButton) {
      return;
    }

    // Otherwise, dynamically create the form
    if (!formContainer) {
      formContainer = document.createElement('div');
      formContainer.id = 'addQuoteContainer';
    }

    const inputText = existingText || document.createElement('input');
    inputText.id = 'newQuoteText';
    inputText.type = 'text';
    inputText.placeholder = 'Enter a new quote';

    const inputCat = existingCat || document.createElement('input');
    inputCat.id = 'newQuoteCategory';
    inputCat.type = 'text';
    inputCat.placeholder = 'Enter quote category';

    let addBtn = existingButton || document.createElement('button');
    if (!existingButton) {
      addBtn.textContent = 'Add Quote';
      addBtn.addEventListener('click', addQuote);
    }

    if (!formContainer.contains(inputText)) formContainer.appendChild(inputText);
    if (!formContainer.contains(inputCat)) formContainer.appendChild(inputCat);
    if (!formContainer.contains(addBtn)) formContainer.appendChild(addBtn);

    if (!formContainer.parentElement) {
      document.body.appendChild(formContainer);
    }
  }

  function defaultQuotes() {
    return [
      { text: 'The only limit to our realization of tomorrow is our doubts of today.', category: 'Motivation' },
      { text: 'In the middle of difficulty lies opportunity.', category: 'Inspiration' },
      { text: 'Code is like humor. When you have to explain it, it’s bad.', category: 'Programming' },
      { text: 'Simplicity is the soul of efficiency.', category: 'Programming' },
      { text: 'Life is what happens when you’re busy making other plans.', category: 'Life' },
    ];
  }

  function generateId() {
    if (window.crypto && window.crypto.randomUUID) {
      return `local-${window.crypto.randomUUID()}`;
    }
    return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function ensureQuoteMeta(q) {
    const obj = { ...q };
    if (!obj.id) obj.id = generateId();
    if (!obj.updatedAt) obj.updatedAt = Date.now();
    obj.text = (obj.text || '').toString();
    obj.category = (obj.category || '').toString();
    return obj;
  }

  function saveQuotes() {
    localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(quotes));
  }

  function loadQuotes() {
    const raw = localStorage.getItem(STORAGE_KEY_QUOTES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          quotes = parsed.filter(q => q && typeof q.text === 'string' && typeof q.category === 'string');
        }
      } catch (_) {
        // ignore parse errors
      }
    }

    if (!Array.isArray(quotes) || quotes.length === 0) {
      quotes = defaultQuotes();
      saveQuotes();
    }
    quotes = quotes.map(q => ensureQuoteMeta(q));
    saveQuotes();
  }

  function getUniqueCategories() {
    const set = new Set(
      quotes.map(q => (typeof q.category === 'string' ? q.category.trim() : '')).filter(Boolean)
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function ensureCategoryFilter() {
    let select = document.getElementById('categoryFilter');

    if (!select) {
      select = document.createElement('select');
      select.id = 'categoryFilter';
      select.addEventListener('change', filterQuotes);

      const label = document.createElement('label');
      label.htmlFor = 'categoryFilter';
      label.textContent = 'Filter by category: ';

      const container = document.createElement('div');
      container.id = 'categoryFilterContainer';
      container.appendChild(label);
      container.appendChild(select);

      const refNode = quoteDisplay || document.body.firstElementChild;
      if (refNode && refNode.parentNode) {
        refNode.parentNode.insertBefore(container, refNode);
      } else {
        document.body.insertBefore(container, document.body.firstChild);
      }
    }

    populateCategories();
  }

  function populateCategories() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;

    const saved = localStorage.getItem(STORAGE_KEY_SELECTED_CATEGORY) || 'all';
    const categories = getUniqueCategories();

    select.innerHTML = '';

    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All Categories';
    select.appendChild(allOpt);

    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });

    const toSelect = categories.includes(saved) || saved === 'all' ? saved : 'all';
    select.value = toSelect;
    localStorage.setItem(STORAGE_KEY_SELECTED_CATEGORY, toSelect);
  }

  function pickRandomIndex(n) {
    return Math.floor(Math.random() * n);
  }

  function showRandomQuote() {
    if (!quoteDisplay) return;

    const selectedCategory = localStorage.getItem(STORAGE_KEY_SELECTED_CATEGORY) || 'all';
    const pool = selectedCategory === 'all' ? quotes : quotes.filter(q => q.category === selectedCategory);

    if (pool.length === 0) {
      quoteDisplay.innerHTML = '<p>No quotes available for the selected category.</p>';
      return;
    }

    const last = sessionStorage.getItem(SESSION_KEY_LAST_QUOTE);
    let idx = pickRandomIndex(pool.length);

    if (pool.length > 1 && last) {
      try {
        const lastObj = JSON.parse(last);
        let attempts = 0;
        while (
          attempts < 5 &&
          pool[idx] &&
          lastObj &&
          pool[idx].text === lastObj.text &&
          pool[idx].category === lastObj.category
        ) {
          idx = pickRandomIndex(pool.length);
          attempts++;
        }
      } catch (_) {
        // ignore parse errors
      }
    }

    const quote = pool[idx];

    const block = document.createElement('blockquote');
    block.textContent = quote.text;

    const footer = document.createElement('footer');
    footer.textContent = `— ${quote.category}`;

    quoteDisplay.innerHTML = '';
    quoteDisplay.appendChild(block);
    quoteDisplay.appendChild(footer);

    sessionStorage.setItem(SESSION_KEY_LAST_QUOTE, JSON.stringify(quote));
  }

  function filterQuotes() {
    const select = document.getElementById('categoryFilter');
    const selectedCategory = select ? select.value : 'all';
    localStorage.setItem(STORAGE_KEY_SELECTED_CATEGORY, selectedCategory);
    showRandomQuote();
  }

  function addQuote() {
    const inputText = document.getElementById('newQuoteText');
    const inputCategory = document.getElementById('newQuoteCategory');

    const text = (inputText && inputText.value ? inputText.value : '').trim();
    const category = (inputCategory && inputCategory.value ? inputCategory.value : '').trim();

    if (!text || !category) {
      alert('Please enter both quote text and category.');
      return;
    }

    quotes.push(ensureQuoteMeta({ text, category }));
    saveQuotes();
    populateCategories();

    if (inputText) inputText.value = '';
    if (inputCategory) inputCategory.value = '';

    showRandomQuote();
  }

  function exportToJsonFile() {
    const dataStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `quotes-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  function ensureImportExportUI() {
    let container = document.getElementById('ioControls');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ioControls';
      document.body.appendChild(container);
    }

    if (!document.getElementById('exportBtn')) {
      const btn = document.createElement('button');
      btn.id = 'exportBtn';
      btn.textContent = 'Export Quotes (JSON)';
      btn.addEventListener('click', exportToJsonFile);
      container.appendChild(btn);
    }

    if (!document.getElementById('importFile')) {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'importFile';
      input.accept = '.json,application/json';
      input.addEventListener('change', importFromJsonFile);
      container.appendChild(input);
    }
  }

  function ensureStatusUI() {
    if (!document.getElementById('syncStatus')) {
      const div = document.createElement('div');
      div.id = 'syncStatus';
      document.body.appendChild(div);
    }
  }

  function setStatus(msg) {
    const el = document.getElementById('syncStatus');
    if (el) el.textContent = msg;
  }

  function ensureSyncUI() {
    let container = document.getElementById('syncControls');
    if (!container) {
      container = document.createElement('div');
      container.id = 'syncControls';
      document.body.appendChild(container);
    }

    if (!document.getElementById('syncNowBtn')) {
      const btn = document.createElement('button');
      btn.id = 'syncNowBtn';
      btn.textContent = 'Sync Now';
      btn.addEventListener('click', syncWithServer);
      container.appendChild(btn);
    }

    if (!document.getElementById('reviewConflictsBtn')) {
      const btn2 = document.createElement('button');
      btn2.id = 'reviewConflictsBtn';
      btn2.textContent = 'Review Conflicts (0)';
      btn2.addEventListener('click', reviewConflicts);
      container.appendChild(btn2);
    }

    if (!document.getElementById('conflictList')) {
      const list = document.createElement('div');
      list.id = 'conflictList';
      list.hidden = true;
      container.appendChild(list);
    }
  }

  function importFromJsonFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid format: expected an array of quotes.');
        const sanitized = imported
          .filter(it => it && typeof it.text === 'string' && typeof it.category === 'string')
          .map(it => ({ text: it.text.trim(), category: it.category.trim() }))
          .filter(it => it.text && it.category);

        if (sanitized.length === 0) throw new Error('No valid quotes found in file.');

        quotes.push(...sanitized.map(ensureQuoteMeta));
        saveQuotes();
        populateCategories();
        alert('Quotes imported successfully!');
        event.target.value = '';
        showRandomQuote();
      } catch (err) {
        alert('Failed to import: ' + err.message);
      }
    };

    fileReader.onerror = () => {
      alert('Error reading the file.');
    };

    fileReader.readAsText(file);
  }

  async function syncWithServer() {
    setStatus('Syncing with server...');
    try {
      const resp = await fetch(`${SERVER_ENDPOINT}?_limit=20`);
      const posts = await resp.json();
      const serverQuotes = Array.isArray(posts)
        ? posts.map(p => ensureQuoteMeta({
            id: `server-${p.id}`,
            text: ((p.title || p.body || '').toString().trim()) || `Server post #${p.id}`,
            category: `Server:user-${p.userId}`,
            updatedAt: Date.now(),
          }))
        : [];

      const localById = new Map(quotes.map(q => [q.id, q]));
      let newCount = 0;
      let updateCount = 0;
      let conflictCount = 0;
      const newConflicts = [];

      serverQuotes.forEach(s => {
        if (localById.has(s.id)) {
          const idx = quotes.findIndex(q => q.id === s.id);
          if (idx !== -1) {
            const lq = quotes[idx];
            if (lq.text !== s.text || lq.category !== s.category) {
              quotes[idx] = s;
              updateCount++;
            }
          }
        } else {
          const conflictIdx = quotes.findIndex(q => q.text === s.text && q.id !== s.id);
          if (conflictIdx !== -1) {
            const localConflict = quotes[conflictIdx];
            quotes.splice(conflictIdx, 1);
            quotes.push(s);
            newConflicts.push({ id: s.id, local: localConflict, server: s });
            conflictCount++;
          } else {
            quotes.push(s);
            newCount++;
          }
        }
      });

      conflicts = newConflicts;
      saveQuotes();
      populateCategories();
      updateConflictButton();
      setStatus(`Sync complete: ${newCount} new, ${updateCount} updated, ${conflictCount} conflicts`);
      showRandomQuote();
    } catch (e) {
      setStatus('Sync failed: ' + (e && e.message ? e.message : 'Unknown error'));
    }
  }

  function reviewConflicts() {
    ensureSyncUI();
    const list = document.getElementById('conflictList');
    if (!list) return;
    list.innerHTML = '';

    if (conflicts.length === 0) {
      list.hidden = true;
      alert('No conflicts to review.');
      return;
    }

    conflicts.forEach(c => {
      const item = document.createElement('div');
      const text = document.createElement('p');
      text.textContent = `Conflict: "${c.server.text}" | Local category: ${c.local.category} vs Server category: ${c.server.category}`;

      const keepLocal = document.createElement('button');
      keepLocal.textContent = 'Keep Local';
      keepLocal.addEventListener('click', () => resolveConflictKeepLocal(c.id));

      const keepServer = document.createElement('button');
      keepServer.textContent = 'Keep Server';
      keepServer.addEventListener('click', () => resolveConflictKeepServer(c.id));

      item.appendChild(text);
      item.appendChild(keepLocal);
      item.appendChild(keepServer);
      list.appendChild(item);
    });

    list.hidden = false;
  }

  function resolveConflictKeepLocal(conflictId) {
    const cIdx = conflicts.findIndex(c => c.id === conflictId);
    if (cIdx === -1) return;
    const c = conflicts[cIdx];

    const sIdx = quotes.findIndex(q => q.id === c.server.id);
    if (sIdx !== -1) {
      quotes.splice(sIdx, 1);
    }

    if (quotes.findIndex(q => q.id === c.local.id) === -1) {
      quotes.push(ensureQuoteMeta(c.local));
    }

    conflicts.splice(cIdx, 1);
    saveQuotes();
    populateCategories();
    updateConflictButton();
    setStatus('Conflict resolved: kept local.');
    reviewConflicts();
    showRandomQuote();
  }

  function resolveConflictKeepServer(conflictId) {
    const cIdx = conflicts.findIndex(c => c.id === conflictId);
    if (cIdx === -1) return;
    const c = conflicts[cIdx];

    if (quotes.findIndex(q => q.id === c.server.id) === -1) {
      quotes.push(ensureQuoteMeta(c.server));
    }

    const lIdx = quotes.findIndex(q => q.id === c.local.id);
    if (lIdx !== -1) {
      quotes.splice(lIdx, 1);
    }

    conflicts.splice(cIdx, 1);
    saveQuotes();
    populateCategories();
    updateConflictButton();
    setStatus('Conflict resolved: kept server.');
    reviewConflicts();
    showRandomQuote();
  }

  function updateConflictButton() {
    const btn = document.getElementById('reviewConflictsBtn');
    if (btn) btn.textContent = `Review Conflicts (${conflicts.length})`;
  }

  // Expose functions globally for inline handlers and manual access
  window.showRandomQuote = showRandomQuote;
  window.createAddQuoteForm = createAddQuoteForm;
  window.addQuote = addQuote;
  window.populateCategories = populateCategories;
  window.filterQuotes = filterQuotes;
  window.importFromJsonFile = importFromJsonFile;
  window.exportToJsonFile = exportToJsonFile;
  window.syncWithServer = syncWithServer;
  window.reviewConflicts = reviewConflicts;

  function init() {
    createAddQuoteForm();
    loadQuotes();
    ensureCategoryFilter();
    ensureImportExportUI();
    ensureStatusUI();
    ensureSyncUI();
    syncWithServer();
    setInterval(syncWithServer, SYNC_INTERVAL_MS);

    if (newQuoteBtn) newQuoteBtn.addEventListener('click', showRandomQuote);

    try {
      const last = sessionStorage.getItem(SESSION_KEY_LAST_QUOTE);
      if (last) {
        const q = JSON.parse(last);
        quoteDisplay.innerHTML = '';
        const block = document.createElement('blockquote');
        block.textContent = q.text;
        const footer = document.createElement('footer');
        footer.textContent = `— ${q.category}`;
        quoteDisplay.appendChild(block);
        quoteDisplay.appendChild(footer);
      } else {
        showRandomQuote();
      }
    } catch (_) {
      showRandomQuote();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
