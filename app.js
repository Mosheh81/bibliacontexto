const CALENDAR_URL = "./app/src/main/assets/calendario.json";
const root = document.querySelector("#app");

let weeks = [];
let selectedBlock = null;
let searchTerm = "";

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
        <a class="header-link" href="#/">${isDetail ? "Ver calendario" : "156 semanas"}</a>
      </div>
    </header>
    ${content}
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
}

function passage(label, value) {
  return `
    <div class="passage">
      <span class="passage-label">${label}</span>
      <span class="passage-value">${escapeHtml(value)}</span>
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
            <strong>${escapeHtml(week.porcion)}</strong>
          </div>
          <div class="overview-item">
            <span>Otros libros</span>
            <strong>${escapeHtml(week.otrosLibros)}</strong>
          </div>
          <div class="overview-item">
            <span>Lectura complementaria</span>
            <strong>${week.complementaria ? escapeHtml(week.complementaria) : "—"}</strong>
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
