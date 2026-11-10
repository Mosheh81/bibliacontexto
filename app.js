const CALENDAR_URL = "./app/src/main/assets/calendario.json";
const BIBLE_ASSETS_URL = "./app/src/main/assets/biblia/";
const root = document.querySelector("#app");

let weeks = [];
let selectedBlock = null;
let searchTerm = "";
let bibleBooksPromise;
let bibleRequestId = 0;
const bibleBookCache = new Map();

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const normalize = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

function currentWeekNumber() {
  const match = window.location.hash.match(/^#\/semana\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

function currentCalendarWeekLabel(today = new Date()) {
  const startDay = Date.UTC(2026, 10, 15);
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  if (currentDay < startDay) return "Iniciamos el 15 de noviembre de 2026";

  const weekNumber = Math.floor((currentDay - startDay) / (7 * 24 * 60 * 60 * 1000)) + 1;
  if (weekNumber > weeks.length) return "Calendario finalizado";
  return `Estamos en la semana ${weekNumber}`;
}

function navigate(path) {
  if (window.location.hash === path) {
    render();
  } else {
    window.location.hash = path;
  }
}

function shell(content, isDetail = false) {
  return `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="#/" aria-label="Calendario Bíblico, inicio">
          <img
            class="brand-mark"
            src="./app/src/main/res/drawable-nodpi/calendario_biblico.png"
            alt=""
          />
          <span class="brand-copy">
            <span class="brand-name">Calendario Bíblico</span>
            <span class="week-status">${currentCalendarWeekLabel()}</span>
          </span>
        </a>
        <a class="header-link" href="#/">${isDetail ? "Ver calendario" : `${weeks.length} semanas`}</a>
      </div>
    </header>
    ${content}
    <aside class="bible-widget" aria-label="Consulta bíblica">
      <section class="bible-panel" id="bible-panel" aria-labelledby="bible-title" hidden>
        <div class="bible-panel-heading">
          <div>
            <p class="eyebrow">Lectura bíblica</p>
            <h2 id="bible-title">Consultar una cita</h2>
          </div>
          <button class="bible-close" id="bible-close" type="button" aria-label="Cerrar consulta bíblica">×</button>
        </div>
        <form class="bible-search" id="bible-search">
          <label for="bible-reference">Referencia</label>
          <div class="bible-search-row">
            <input
              id="bible-reference"
              type="search"
              placeholder="Ej. Juan 3:16-18"
              autocomplete="off"
              required
            />
            <button class="nav-button primary" type="submit">Leer</button>
          </div>
          <p>Busca un capítulo, un versículo o un rango.</p>
        </form>
        <div class="bible-result" id="bible-result" aria-live="polite">
          <p class="bible-prompt">Abre una cita del calendario o escribe una referencia.</p>
        </div>
      </section>
      <button
        class="bible-toggle"
        id="bible-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="bible-panel"
      ><span aria-hidden="true">▤</span> Biblia</button>
    </aside>
    <footer class="site-footer">
      <div class="footer-inner">
        <p>Un día a la vez, una lectura a la vez.</p>
        <p>Calendario de lectura bíblica</p>
      </div>
    </footer>
  `;
}

function getFilteredWeeks() {
  const query = normalize(searchTerm.trim());

  return weeks.filter((week) => {
    if (selectedBlock && week.bloque !== selectedBlock) return false;
    if (!query) return true;

    const searchable = [
      week.numero,
      week.bloque,
      week.parasha,
      week.porcion,
      week.otrosLibros,
      week.complementaria,
      ...week.dias.flatMap((day) => [day.dia, day.torah, day.otros]),
    ]
      .map(normalize)
      .join(" ");

    return searchable.includes(query);
  });
}

function weekCard(week) {
  return `
    <button class="week-card" type="button" data-week="${week.numero}">
      <span class="week-card-top">
        <span class="week-number">Semana ${week.numero}</span>
        <span class="week-block">${escapeHtml(week.bloque)}</span>
      </span>
      <span class="week-title">${escapeHtml(week.parasha)}</span>
      <span class="week-reading">Torá: ${escapeHtml(week.porcion)}</span>
      <span class="week-reading">Otros libros: ${escapeHtml(week.otrosLibros)}</span>
      <span class="card-arrow" aria-hidden="true">→</span>
    </button>
  `;
}

function renderWeekResults() {
  const results = getFilteredWeeks();
  const list = root.querySelector("#week-list");
  const count = root.querySelector("#result-count");

  count.textContent = `${results.length} ${results.length === 1 ? "semana" : "semanas"}`;
  list.innerHTML = results.length
    ? results.map(weekCard).join("")
    : `
      <div class="empty-state">
        <strong>No encontramos semanas</strong>
        Prueba con otro libro, parashá o número de semana.
      </div>
    `;

  list.querySelectorAll("[data-week]").forEach((button) => {
    button.addEventListener("click", () => navigate(`#/semana/${button.dataset.week}`));
  });
}

function renderHome() {
  const blocks = [...new Set(weeks.map((week) => week.bloque))];
  root.innerHTML = shell(`
    <main class="page">
      <section class="home-hero" aria-labelledby="home-title">
        <div>
          <p class="eyebrow">Lectura diaria · un recorrido semanal</p>
          <h1 id="home-title">La Palabra, día a día.</h1>
          <p class="hero-description">
            Explora el calendario, encuentra una parashá o abre cualquier semana
            para consultar sus lecturas de cada día.
          </p>
        </div>
        <div class="hero-stat" aria-label="${weeks.length} semanas disponibles">
          <strong>${weeks.length}</strong>
          <span>semanas de lectura</span>
        </div>
      </section>

      <section class="catalog" aria-labelledby="catalog-title">
        <div class="section-heading">
          <h2 id="catalog-title">Explora el calendario</h2>
          <p class="result-count" id="result-count" aria-live="polite"></p>
        </div>
        <div class="catalog-controls">
          <label class="search-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.8"></circle>
              <path d="m16 16 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
            <input
              class="search-input"
              id="week-search"
              type="search"
              placeholder="Buscar por parashá, libro o semana…"
              value="${escapeHtml(searchTerm)}"
              autocomplete="off"
            />
          </label>
          <div>
            <span class="filter-label">Filtrar por bloque</span>
            <div class="filter-list" aria-label="Bloques del calendario">
              <button
                class="filter-chip"
                type="button"
                data-block=""
                aria-pressed="${selectedBlock === null}"
              >Todas</button>
              ${blocks
                .map(
                  (block) => `
                    <button
                      class="filter-chip"
                      type="button"
                      data-block="${escapeHtml(block)}"
                      aria-pressed="${selectedBlock === block}"
                    >${escapeHtml(block)}</button>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
        <div class="week-list" id="week-list" aria-label="Semanas del calendario"></div>
      </section>
    </main>
  `);

  root.querySelector("#week-search").addEventListener("input", (event) => {
    searchTerm = event.target.value;
    renderWeekResults();
  });

  root.querySelectorAll("[data-block]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedBlock = button.dataset.block || null;
      renderHome();
    });
  });

  renderWeekResults();
  setupBibleWidget();
}

function scriptureReferences(value) {
  return value
    .split(";")
    .map((reference) => reference.trim())
    .filter(Boolean)
    .map((reference) => {
      const localReference = reference
        .replace(/\s*\(Parte\s+\d+\/\d+\)\s*$/, "")
        .replace(/[–—]/g, "-");

      return `
        <button
          class="scripture-reference"
          type="button"
          data-bible-reference="${escapeHtml(localReference)}"
          aria-label="Leer ${escapeHtml(localReference)} en esta página"
        >${escapeHtml(reference)}</button>
      `;
    })
    .join("; ");
}

function setupBibleWidget() {
  const panel = root.querySelector("#bible-panel");
  const toggle = root.querySelector("#bible-toggle");
  const close = root.querySelector("#bible-close");
  const input = root.querySelector("#bible-reference");
  const form = root.querySelector("#bible-search");

  const setOpen = (isOpen) => {
    panel.hidden = !isOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) input.focus();
    else toggle.focus();
  };

  toggle.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => setOpen(false));
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    lookupBibleReference(input.value);
  });
  root.querySelectorAll("[data-bible-reference]").forEach((button) => {
    button.addEventListener("click", () => {
      setOpen(true);
      lookupBibleReference(button.dataset.bibleReference);
    });
  });
}

async function loadBibleBooks() {
  if (!bibleBooksPromise) {
    bibleBooksPromise = fetch(`${BIBLE_ASSETS_URL}Books.json`).then((response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar la lista de libros (${response.status}).`);
      }
      return response.json();
    }).then((books) => {
      if (!Array.isArray(books) || books.some((book) => typeof book !== "string")) {
        throw new Error("La lista de libros bíblicos tiene un formato no válido.");
      }
      return books.map((name) => {
        const aliases = [name, name.replace(/\bsan\s+/i, "")];
        const additionalAliases = {
          salmos: ["Salmo"],
          "los actos": ["Hechos"],
          revelacion: ["Apocalipsis"],
        };
        aliases.push(...(additionalAliases[normalize(name)] || []));
        return { name, aliases: [...new Set(aliases.map(normalize))] };
      }).sort((left, right) =>
        Math.max(...right.aliases.map((alias) => alias.length)) -
        Math.max(...left.aliases.map((alias) => alias.length)),
      );
    }).catch((error) => {
      bibleBooksPromise = null;
      throw error;
    });
  }
  return bibleBooksPromise;
}

async function loadBibleBook(bookName) {
  if (!bibleBookCache.has(bookName)) {
    const url = `${BIBLE_ASSETS_URL}${encodeURIComponent(bookName)}.json`;
    const request = fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar ${bookName} (${response.status}).`);
      }
      return response.json();
    }).then((data) => {
      if (
        data.book !== bookName ||
        !Array.isArray(data.chapters) ||
        data.chapters.some((chapter) => !Array.isArray(chapter.verses))
      ) {
        throw new Error(`Los datos de ${bookName} tienen un formato no válido.`);
      }
      return data;
    });
    bibleBookCache.set(bookName, request);
    request.catch(() => bibleBookCache.delete(bookName));
  }
  return bibleBookCache.get(bookName);
}

function findBibleBook(reference, books) {
  const normalizedReference = normalize(reference).replace(/\s+/g, " ").trim();
  for (const book of books) {
    for (const alias of book.aliases) {
      if (normalizedReference === alias || normalizedReference.startsWith(`${alias} `)) {
        return {
          book,
          passage: normalizedReference.slice(alias.length).trim(),
        };
      }
    }
  }
  throw new Error("No reconocemos ese libro. Revisa el nombre de la referencia.");
}

function parseBiblePassage(passage) {
  const match = passage.match(
    /^(\d+)(?:\s*:\s*(\d+)(?:\s*[-–—]\s*(?:(\d+)\s*:\s*)?(\d+))?|\s*[-–—]\s*(\d+))?$/,
  );
  if (!match) {
    throw new Error("Usa un formato como Juan 3:16, Salmos 23 o Génesis 1:1-2:3.");
  }

  const chapterStart = Number(match[1]);
  const verseStart = match[2] ? Number(match[2]) : null;
  const chapterEnd = match[5]
    ? Number(match[5])
    : match[3]
      ? Number(match[3])
      : chapterStart;
  const verseEnd = match[4]
    ? Number(match[4])
    : verseStart === null
      ? null
      : verseStart;

  if (chapterEnd < chapterStart) {
    throw new Error("El capítulo final debe ser igual o posterior al inicial.");
  }
  if (chapterEnd - chapterStart > 20) {
    throw new Error("El rango no puede abarcar más de 21 capítulos.");
  }
  return { chapterStart, chapterEnd, verseStart, verseEnd };
}

function renderBiblePassage(data, passage, reference) {
  const range = parseBiblePassage(passage);
  const chapters = data.chapters.filter(
    (chapter) => chapter.chapter >= range.chapterStart && chapter.chapter <= range.chapterEnd,
  );
  if (chapters.length !== range.chapterEnd - range.chapterStart + 1) {
    throw new Error(`No encontramos ese rango de capítulos en ${data.book}.`);
  }

  const renderedChapters = chapters.map((chapter) => {
    const firstVerse = chapter.chapter === range.chapterStart ? range.verseStart : null;
    const lastVerse = chapter.chapter === range.chapterEnd ? range.verseEnd : null;
    const verses = chapter.verses.filter((verse) =>
      (firstVerse === null || verse.verse >= firstVerse) &&
      (lastVerse === null || verse.verse <= lastVerse),
    );

    if (verses.length === 0 || (firstVerse !== null && verses[0].verse !== firstVerse)) {
      throw new Error(`No encontramos ese rango de versículos en ${data.book} ${chapter.chapter}.`);
    }
    if (lastVerse !== null && verses[verses.length - 1].verse !== lastVerse) {
      throw new Error(`No encontramos ese rango de versículos en ${data.book} ${chapter.chapter}.`);
    }

    return `
      <section class="bible-chapter" aria-label="${escapeHtml(data.book)} ${chapter.chapter}">
        ${chapters.length > 1 || range.verseStart === null ? `<h3>${escapeHtml(data.book)} ${chapter.chapter}</h3>` : ""}
        ${verses.map((verse) => `
          <p class="bible-verse"><sup>${verse.verse}</sup>${escapeHtml(verse.text)}</p>
        `).join("")}
      </section>
    `;
  }).join("");

  return `
    <h3 class="bible-passage-title">${escapeHtml(reference)}</h3>
    ${renderedChapters}
  `;
}

async function lookupBibleReference(reference) {
  const result = root.querySelector("#bible-result");
  const input = root.querySelector("#bible-reference");
  const requestId = ++bibleRequestId;
  input.value = reference.trim();
  result.innerHTML = '<p class="bible-prompt">Cargando la cita…</p>';

  try {
    const books = await loadBibleBooks();
    const match = findBibleBook(reference, books);
    if (!match.passage) {
      throw new Error("Añade un capítulo o versículo, por ejemplo: Juan 3:16.");
    }
    const data = await loadBibleBook(match.book.name);
    const content = renderBiblePassage(data, match.passage, reference.trim());
    if (requestId === bibleRequestId) result.innerHTML = content;
  } catch (error) {
    console.error("Error al consultar la Biblia:", error);
    if (requestId === bibleRequestId) {
      result.innerHTML = `<p class="bible-error">${escapeHtml(error.message)}</p>`;
    }
  }
}

function passage(label, value) {
  return `
    <div class="passage">
      <span class="passage-label">${label}</span>
      <span class="passage-value">${scriptureReferences(value)}</span>
    </div>
  `;
}

function dayCard(day, index) {
  return `
    <article class="day-card">
      <div class="day-heading">
        <h3>${escapeHtml(day.dia)}</h3>
        <span class="day-index" aria-label="Día ${index + 1}">${index + 1}</span>
      </div>
      ${passage("Torá", day.torah)}
      ${passage("Otros libros", day.otros)}
    </article>
  `;
}

function renderDetail(week) {
  const previous = week.numero > 1 ? week.numero - 1 : null;
  const next = week.numero < weeks.length ? week.numero + 1 : null;

  root.innerHTML = shell(
    `
      <main class="page detail-page">
        <a class="back-link" href="#/"><span aria-hidden="true">←</span> Volver al calendario</a>
        <section class="detail-heading" aria-labelledby="detail-title">
          <div>
            <p class="eyebrow">${escapeHtml(week.bloque)} · Semana ${week.numero}</p>
            <h1 id="detail-title">${escapeHtml(week.parasha)}</h1>
          </div>
          <label class="week-jump">
            <span class="week-jump-label">Ir a la semana</span>
            <select class="week-select" id="week-select" aria-label="Ir a otra semana">
              ${weeks
                .map(
                  (item) => `
                    <option value="${item.numero}" ${item.numero === week.numero ? "selected" : ""}>
                      Semana ${item.numero}
                    </option>
                  `,
                )
                .join("")}
            </select>
          </label>
        </section>

        <section class="overview-card" aria-label="Resumen de lecturas">
          <div class="overview-item">
            <span>Porción de Torá</span>
            <strong>${scriptureReferences(week.porcion)}</strong>
          </div>
          <div class="overview-item">
            <span>Otros libros</span>
            <strong>${scriptureReferences(week.otrosLibros)}</strong>
          </div>
          <div class="overview-item">
            <span>Lectura complementaria</span>
            <strong>${week.complementaria ? scriptureReferences(week.complementaria) : "—"}</strong>
          </div>
        </section>

        <section aria-labelledby="readings-title">
          <div class="readings-heading">
            <h2 id="readings-title">Lecturas de la semana</h2>
            <p>${week.dias.length} días de lectura</p>
          </div>
          <div class="day-list">
            ${week.dias.map(dayCard).join("")}
          </div>
        </section>

        <nav class="week-navigation" aria-label="Navegar entre semanas">
          <button class="nav-button" type="button" data-go="${previous ?? ""}" ${previous ? "" : "disabled"}>
            <span aria-hidden="true">←</span> Semana anterior
          </button>
          <button class="nav-button primary" type="button" data-go="${next ?? ""}" ${next ? "" : "disabled"}>
            Semana siguiente <span aria-hidden="true">→</span>
          </button>
        </nav>
      </main>
    `,
    true,
  );

  root.querySelector("#week-select").addEventListener("change", (event) => {
    navigate(`#/semana/${event.target.value}`);
  });

  root.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.go) navigate(`#/semana/${button.dataset.go}`);
    });
  });
  setupBibleWidget();
}

function renderError() {
  root.innerHTML = `
    <main class="error-state" role="alert">
      <p class="eyebrow">No se pudo abrir el calendario</p>
      <h1>Algo salió mal.</h1>
      <p>
        No pudimos cargar los datos de lectura. Comprueba que estás sirviendo
        este proyecto desde un servidor web y vuelve a intentarlo.
      </p>
      <button class="nav-button primary" id="retry-load" type="button">Reintentar</button>
    </main>
  `;
  root.querySelector("#retry-load").addEventListener("click", () => window.location.reload());
}

function render() {
  const number = currentWeekNumber();
  const week = number === null ? null : weeks.find((item) => item.numero === number);
  if (week) {
    renderDetail(week);
  } else {
    renderHome();
  }
}

async function start() {
  try {
    const response = await fetch(CALENDAR_URL);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el calendario (${response.status}).`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("El archivo de calendario no contiene semanas.");
    }
    weeks = data;
    window.addEventListener("hashchange", render);

    if (!window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/`);
    }
    render();
  } catch (error) {
    console.error("Error al iniciar el Calendario Bíblico:", error);
    renderError();
  }
}

start();
