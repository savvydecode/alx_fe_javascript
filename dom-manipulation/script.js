(() => {
  const STORAGE_KEY_QUOTES = 'dqg_quotes';
  const STORAGE_KEY_SELECTED_CATEGORY = 'dqg_selected_category';
  const SESSION_KEY_LAST_QUOTE = 'dqg_last_quote';

  let quotes = [];

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

    quotes.push({ text, category });
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

        quotes.push(...sanitized);
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

  // Expose functions globally for inline handlers and manual access
  window.showRandomQuote = showRandomQuote;
  window.createAddQuoteForm = createAddQuoteForm;
  window.addQuote = addQuote;
  window.populateCategories = populateCategories;
  window.filterQuotes = filterQuotes;
  window.importFromJsonFile = importFromJsonFile;
  window.exportToJsonFile = exportToJsonFile;

  function init() {
    createAddQuoteForm();
    loadQuotes();
    ensureCategoryFilter();
    ensureImportExportUI();

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
