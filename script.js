(() => {
  "use strict";

  const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
  const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  const REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
  const UNIT_KEY = "stillsky:unit";
  const LAST_PLACE_KEY = "stillsky:last-place";

  const $ = (id) => document.getElementById(id);

  const els = {
    main: $("main"),
    form: $("search-form"),
    input: $("city-input"),
    locateBtn: $("locate-btn"),
    unitButtons: document.querySelectorAll(".unit-toggle button"),
    views: {
      intro: $("view-intro"),
      loading: $("view-loading"),
      error: $("view-error"),
      weather: $("view-weather"),
    },
    loadingText: $("loading-text"),
    loadingHint: $("loading-hint"),
    errorTitle: $("error-title"),
    errorMessage: $("error-message"),
    retryBtn: $("retry-btn"),
    searchAgainBtn: $("search-again-btn"),
    currentCard: $("current-card"),
    cityName: $("city-name"),
    cityRegion: $("city-region"),
    cityTime: $("city-time"),
    currentIcon: $("current-icon"),
    currentTemp: $("current-temp"),
    currentUnitLabel: $("current-unit-label"),
    currentCondition: $("current-condition"),
    currentRange: $("current-range"),
    humidity: $("humidity"),
    wind: $("wind"),
    feels: $("feels"),
    forecastList: $("forecast-list"),
    skyLayers: document.querySelectorAll(".sky__layer"),
    canvas: $("particles"),
    flash: $("flash"),
    themeColor: document.querySelector('meta[name="theme-color"]'),
  };

  const state = {
    unit: readStorage(UNIT_KEY) === "fahrenheit" ? "fahrenheit" : "celsius",
    place: null,
    lastAction: null,
    controller: null,
  };

  /* ------------------------------------------------------------------ */
  /* Weather codes (WMO) → label, icon, scene                            */
  /* ------------------------------------------------------------------ */

  const WMO = {
    0: ["Clear sky", "clear"],
    1: ["Mainly clear", "partly"],
    2: ["Partly cloudy", "partly"],
    3: ["Overcast", "cloudy"],
    45: ["Foggy", "fog"],
    48: ["Freezing fog", "fog"],
    51: ["Light drizzle", "drizzle"],
    53: ["Drizzle", "drizzle"],
    55: ["Heavy drizzle", "drizzle"],
    56: ["Freezing drizzle", "drizzle"],
    57: ["Freezing drizzle", "drizzle"],
    61: ["Light rain", "rain"],
    63: ["Rain", "rain"],
    65: ["Heavy rain", "rain"],
    66: ["Freezing rain", "rain"],
    67: ["Freezing rain", "rain"],
    71: ["Light snow", "snow"],
    73: ["Snow", "snow"],
    75: ["Heavy snow", "snow"],
    77: ["Snow grains", "snow"],
    80: ["Light showers", "rain"],
    81: ["Showers", "rain"],
    82: ["Heavy showers", "rain"],
    85: ["Snow showers", "snow"],
    86: ["Heavy snow showers", "snow"],
    95: ["Thunderstorm", "storm"],
    96: ["Thunderstorm with hail", "storm"],
    99: ["Thunderstorm with hail", "storm"],
  };

  function describe(code, isDay = true) {
    const [label, kind] = WMO[code] || ["Unsettled", "cloudy"];
    let icon = kind;
    if (kind === "clear" || kind === "partly") icon = `${kind}-${isDay ? "day" : "night"}`;

    let scene;
    switch (kind) {
      case "clear": scene = isDay ? "clear-day" : "clear-night"; break;
      case "partly": scene = isDay ? "partly-day" : "clear-night"; break;
      case "drizzle": scene = "rain"; break;
      default: scene = kind;
    }
    return { label, kind, icon, scene };
  }

  /* ------------------------------------------------------------------ */
  /* Icons (inline SVG, styled via .wx classes in style.css)             */
  /* ------------------------------------------------------------------ */

  const CLOUD = "M20 48h26a9 9 0 0 0 .5-18a13 13 0 0 0-25-2a10 10 0 0 0-1.5 20z";

  const sun = (cx, cy, r) => {
    const rays = [];
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const r1 = r + 5;
      const r2 = r + 10;
      rays.push(
        `M${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)}L${(cx + Math.cos(a) * r2).toFixed(1)} ${(cy + Math.sin(a) * r2).toFixed(1)}`
      );
    }
    return `<path class="i-rays" d="${rays.join("")}"/><circle class="i-sun" cx="${cx}" cy="${cy}" r="${r}"/>`;
  };

  const moon = (t = "") =>
    `<path class="i-moon" ${t} d="M36 10a22 22 0 1 0 20 30A17 17 0 0 1 36 10z"/>`;

  const cloud = (cls = "i-cloud", t = "") => `<path class="${cls}" ${t} d="${CLOUD}"/>`;

  const drops = (count) => {
    const xs = count === 2 ? [27, 39] : [22, 32, 42];
    return xs.map((x) => `<path class="i-drop" d="M${x} 53l-2.5 6"/>`).join("");
  };

  const ICONS = {
    "clear-day": sun(32, 32, 12),
    "clear-night": moon('transform="translate(-4 -2)"'),
    "partly-day": `<g transform="translate(-6 -8) scale(.85)">${sun(32, 32, 11)}</g>${cloud("i-cloud", 'transform="translate(4 4)"')}`,
    "partly-night": `${moon('transform="translate(-8 -8) scale(.7)"')}${cloud("i-cloud", 'transform="translate(4 4)"')}`,
    cloudy: `${cloud("i-cloud--back", 'transform="translate(-8 -8) scale(.85)"')}${cloud("i-cloud", 'transform="translate(4 2)"')}`,
    fog: `${cloud("i-cloud", 'transform="translate(0 -6)"')}<path class="i-mist" d="M14 50h36M20 57h28"/>`,
    drizzle: `${cloud("i-cloud", 'transform="translate(0 -6)"')}${drops(2)}`,
    rain: `${cloud("i-cloud--back", 'transform="translate(-6 -12) scale(.8)"')}${cloud("i-cloud", 'transform="translate(2 -6)"')}${drops(3)}`,
    snow: `${cloud("i-cloud", 'transform="translate(0 -6)"')}<circle class="i-flake" cx="22" cy="54" r="2.4"/><circle class="i-flake" cx="32" cy="58" r="2.4"/><circle class="i-flake" cx="42" cy="54" r="2.4"/>`,
    storm: `${cloud("i-cloud--storm", 'transform="translate(0 -8)"')}<path class="i-bolt" d="M34 42l-8 11h6l-3 9 10-13h-6l3-7z"/>`,
  };

  const iconSvg = (name) =>
    `<svg class="wx" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.cloudy}</svg>`;

  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = iconSvg(el.dataset.icon);
  });

  /* ------------------------------------------------------------------ */
  /* Ambient scene: gradient crossfade + particle canvas                 */
  /* ------------------------------------------------------------------ */

  const SCENE_COLORS = {
    "clear-day": "#5f9fd8",
    "partly-day": "#7aa3cc",
    "clear-night": "#1c2748",
    cloudy: "#8797ab",
    fog: "#a3adb7",
    rain: "#4f6378",
    storm: "#2f3a4b",
    snow: "#b7c6d8",
  };

  const particles = createParticles(els.canvas, els.flash);

  function setScene(scene, kind) {
    document.body.dataset.scene = scene;
    els.skyLayers.forEach((layer) => {
      layer.classList.toggle("is-active", layer.dataset.scene === scene);
    });
    if (els.themeColor && SCENE_COLORS[scene]) {
      els.themeColor.setAttribute("content", SCENE_COLORS[scene]);
    }
    particles.set(kind === "drizzle" ? "drizzle" : scene);
  }

  function createParticles(canvas, flashEl) {
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let mode = "none";
    let drops = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let flashTimer = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function density() {
      const area = (width * height) / (1280 * 800);
      const base = { rain: 170, storm: 240, drizzle: 80, snow: 120 }[mode] || 0;
      const scaled = Math.round(base * Math.max(0.35, Math.min(area, 1.6)));
      return reduceMotion.matches ? Math.round(scaled * 0.35) : scaled;
    }

    function makeParticle(randomY) {
      const snowy = mode === "snow";
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : -20,
        len: snowy ? 0 : 10 + Math.random() * (mode === "drizzle" ? 6 : 14),
        r: snowy ? 1 + Math.random() * 2.6 : 0,
        speed: snowy ? 0.4 + Math.random() * 0.9 : (mode === "drizzle" ? 5 : 8) + Math.random() * 6,
        drift: snowy ? Math.random() * Math.PI * 2 : 0,
        alpha: snowy ? 0.45 + Math.random() * 0.5 : 0.18 + Math.random() * 0.3,
      };
    }

    function seed() {
      drops = Array.from({ length: density() }, () => makeParticle(true));
    }

    function tick() {
      ctx.clearRect(0, 0, width, height);
      const snowy = mode === "snow";
      const slant = mode === "storm" ? 2.2 : 1.1;
      const slow = reduceMotion.matches ? 0.4 : 1;

      ctx.lineCap = "round";
      ctx.lineWidth = 1.1;

      for (const p of drops) {
        if (snowy) {
          p.drift += 0.012 * slow;
          p.x += Math.sin(p.drift) * 0.45 * slow;
          p.y += p.speed * slow;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          p.x += slant * slow;
          p.y += p.speed * slow;
          ctx.globalAlpha = p.alpha;
          ctx.strokeStyle = "#dcebff";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - slant * (p.len / p.speed), p.y - p.len);
          ctx.stroke();
        }

        if (p.y - p.len > height || p.x > width + 20 || p.x < -20) {
          Object.assign(p, makeParticle(false));
        }
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(tick);
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function start() {
      if (!frame && mode !== "none" && !document.hidden) frame = requestAnimationFrame(tick);
    }

    function scheduleFlash() {
      clearTimeout(flashTimer);
      if (mode !== "storm" || reduceMotion.matches) return;
      flashTimer = setTimeout(() => {
        if (!document.hidden) {
          flashEl.classList.add("is-on");
          setTimeout(() => flashEl.classList.remove("is-on"), 180);
        }
        scheduleFlash();
      }, 7000 + Math.random() * 9000);
    }

    function set(scene) {
      const next = ["rain", "storm", "snow", "drizzle"].includes(scene) ? scene : "none";
      if (next === mode) return;
      mode = next;
      seed();
      canvas.classList.toggle("is-visible", mode !== "none");
      scheduleFlash();
      if (mode === "none") {
        // Let the canvas fade out before stopping the loop.
        setTimeout(() => {
          if (mode === "none") {
            stop();
            ctx.clearRect(0, 0, width, height);
          }
        }, 1200);
      } else {
        start();
      }
    }

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    resize();

    return { set };
  }

  /* ------------------------------------------------------------------ */
  /* Views                                                               */
  /* ------------------------------------------------------------------ */

  function showView(name) {
    for (const [key, el] of Object.entries(els.views)) el.hidden = key !== name;
    els.main.setAttribute("aria-busy", String(name === "loading"));
  }

  function showLoading(text, hint = "You can also search for a city above.") {
    els.loadingText.textContent = text;
    els.loadingHint.textContent = hint;
    showView("loading");
  }

  function showError(title, message) {
    els.errorTitle.textContent = title;
    els.errorMessage.textContent = message;
    els.retryBtn.hidden = !state.lastAction;
    showView("error");
  }

  /* ------------------------------------------------------------------ */
  /* Data                                                                */
  /* ------------------------------------------------------------------ */

  class NotFoundError extends Error {}

  function newRequest() {
    if (state.controller) state.controller.abort();
    state.controller = new AbortController();
    return state.controller.signal;
  }

  async function getJson(url, signal) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res.json();
  }

  async function geocode(name, signal) {
    const params = new URLSearchParams({ name, count: "1", language: "en", format: "json" });
    const data = await getJson(`${GEOCODE_URL}?${params}`, signal);
    const hit = data.results && data.results[0];
    if (!hit) throw new NotFoundError(name);
    return {
      name: hit.name,
      region: [hit.admin1, hit.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", "),
      latitude: hit.latitude,
      longitude: hit.longitude,
    };
  }

  async function reverseGeocode(latitude, longitude, signal) {
    try {
      const params = new URLSearchParams({ latitude, longitude, localityLanguage: "en" });
      const data = await getJson(`${REVERSE_URL}?${params}`, signal);
      const name = data.city || data.locality || data.principalSubdivision || "Your location";
      const region = [data.principalSubdivision, data.countryName]
        .filter((v) => v && v !== name)
        .join(", ");
      return { name, region, latitude, longitude };
    } catch (err) {
      if (err.name === "AbortError") throw err;
      return { name: "Your location", region: "", latitude, longitude };
    }
  }

  async function fetchForecast(place, signal) {
    const params = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "6",
      temperature_unit: state.unit,
      wind_speed_unit: state.unit === "fahrenheit" ? "mph" : "kmh",
    });
    return getJson(`${FORECAST_URL}?${params}`, signal);
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  const round = (n) => (Number.isFinite(n) ? Math.round(n) : "--");

  function formatLocalTime(timezone) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date());
    } catch {
      return "";
    }
  }

  function formatDay(isoDate, index) {
    const date = new Date(`${isoDate}T12:00:00Z`);
    const name =
      index === 0
        ? "Tomorrow"
        : new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(date);
    const short = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
    return { name, short };
  }

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function render(place, data) {
    const { current, daily } = data;
    const info = describe(current.weather_code, current.is_day === 1);
    const windUnit = state.unit === "fahrenheit" ? "mph" : "km/h";

    els.cityName.textContent = place.name;
    els.cityRegion.textContent = place.region || "";
    els.cityTime.dataset.tz = data.timezone;
    els.cityTime.textContent = formatLocalTime(data.timezone);
    els.currentIcon.innerHTML = iconSvg(info.icon);
    els.currentTemp.textContent = round(current.temperature_2m);
    els.currentUnitLabel.textContent = state.unit === "fahrenheit" ? "degrees Fahrenheit" : "degrees Celsius";
    els.currentCondition.textContent = info.label;
    els.currentRange.textContent = `H ${round(daily.temperature_2m_max[0])}° · L ${round(daily.temperature_2m_min[0])}°`;
    els.humidity.textContent = `${round(current.relative_humidity_2m)}%`;
    els.wind.textContent = `${round(current.wind_speed_10m)} ${windUnit}`;
    els.feels.textContent = `${round(current.apparent_temperature)}°`;

    const days = daily.time.slice(1, 6).map((iso, i) => {
      const d = describe(daily.weather_code[i + 1], true);
      const { name, short } = formatDay(iso, i);
      const hi = round(daily.temperature_2m_max[i + 1]);
      const lo = round(daily.temperature_2m_min[i + 1]);
      const rain = daily.precipitation_probability_max ? daily.precipitation_probability_max[i + 1] : null;
      return `
        <li class="day glass" style="--i: ${i}" tabindex="0"
            aria-label="${escapeHtml(`${name}, ${d.label}, high ${hi}°, low ${lo}°`)}">
          <p class="day__name">${escapeHtml(name)}</p>
          <p class="day__date">${escapeHtml(short)}</p>
          <div class="day__icon">${iconSvg(d.icon)}</div>
          <p class="day__label">${escapeHtml(d.label)}</p>
          <p class="day__temps"><span class="day__hi">${hi}°</span><span class="day__lo">${lo}°</span></p>
          ${
            Number.isFinite(rain)
              ? `<p class="day__rain"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11Z"/></svg>${rain}%</p>`
              : ""
          }
        </li>`;
    });
    els.forecastList.innerHTML = days.join("");
    els.forecastList.scrollLeft = 0;

    setScene(info.scene, info.kind);
    document.title = `${round(current.temperature_2m)}° ${place.name} — Stillsky`;

    showView("weather");
    els.currentCard.classList.remove("is-entering");
    void els.currentCard.offsetWidth;
    els.currentCard.classList.add("is-entering");
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  async function loadPlace(place, { quiet = false } = {}) {
    state.lastAction = () => loadPlace(place);
    const signal = newRequest();
    if (!quiet) showLoading(`Gathering the forecast for ${place.name}…`, "Just a moment.");
    try {
      const data = await fetchForecast(place, signal);
      state.place = place;
      writeStorage(LAST_PLACE_KEY, JSON.stringify(place));
      render(place, data);
    } catch (err) {
      if (err.name === "AbortError") return;
      showError("Something went quiet", "We couldn’t reach the forecast service. Check your connection and try again.");
    }
  }

  async function searchCity(query) {
    const name = query.trim();
    if (!name) {
      els.input.focus();
      return;
    }
    state.lastAction = () => searchCity(name);
    const signal = newRequest();
    showLoading(`Looking for ${name}…`, "Just a moment.");
    try {
      const place = await geocode(name, signal);
      await loadPlace(place);
    } catch (err) {
      if (err.name === "AbortError") return;
      if (err instanceof NotFoundError) {
        showError(
          "We couldn’t find that place",
          `Nothing matched “${name}”. Check the spelling, or try a nearby larger city.`
        );
      } else {
        showError("Something went quiet", "We couldn’t reach the search service. Check your connection and try again.");
      }
    }
  }

  function locate({ onLoad = false } = {}) {
    if (!("geolocation" in navigator)) {
      if (onLoad) return fallbackStart();
      state.lastAction = null;
      return showError("Location unavailable", "Your browser doesn’t support location. Search for a city instead.");
    }

    state.lastAction = () => locate();
    const signal = newRequest();
    showLoading("Finding your location…", "Allow location access, or search for a city above.");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (signal.aborted) return;
        try {
          const place = await reverseGeocode(
            Number(coords.latitude.toFixed(4)),
            Number(coords.longitude.toFixed(4)),
            signal
          );
          if (!signal.aborted) loadPlace(place);
        } catch (err) {
          if (err.name !== "AbortError") fallbackStart();
        }
      },
      (err) => {
        if (signal.aborted) return;
        if (onLoad) return fallbackStart();
        showError(
          err.code === err.PERMISSION_DENIED ? "Location is turned off" : "Couldn’t find you",
          err.code === err.PERMISSION_DENIED
            ? "Allow location access in your browser settings, or search for a city above."
            : "We couldn’t determine your location. Try again, or search for a city instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }

  function fallbackStart() {
    const saved = readPlace();
    if (saved) {
      loadPlace(saved);
    } else {
      state.lastAction = null;
      showView("intro");
    }
  }

  function setUnit(unit) {
    if (unit === state.unit) return;
    state.unit = unit;
    writeStorage(UNIT_KEY, unit);
    syncUnitButtons();
    if (state.place && !els.views.weather.hidden) loadPlace(state.place, { quiet: true });
  }

  function syncUnitButtons() {
    els.unitButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.unit === state.unit)));
  }

  /* ------------------------------------------------------------------ */
  /* Storage helpers (preferences only)                                  */
  /* ------------------------------------------------------------------ */

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable (private mode) — safe to ignore */
    }
  }

  function readPlace() {
    try {
      const p = JSON.parse(readStorage(LAST_PLACE_KEY));
      return p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) ? p : null;
    } catch {
      return null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    searchCity(els.input.value);
    els.input.blur();
  });

  els.locateBtn.addEventListener("click", () => locate());

  els.unitButtons.forEach((btn) => btn.addEventListener("click", () => setUnit(btn.dataset.unit)));

  document.querySelectorAll(".chip[data-city]").forEach((chip) => {
    chip.addEventListener("click", () => {
      els.input.value = chip.dataset.city;
      searchCity(chip.dataset.city);
    });
  });

  els.retryBtn.addEventListener("click", () => {
    if (state.lastAction) state.lastAction();
  });

  els.searchAgainBtn.addEventListener("click", () => {
    els.input.select();
    els.input.focus();
  });

  // Keep the local clock on the card fresh.
  setInterval(() => {
    if (!els.views.weather.hidden && state.place && els.cityTime.dataset.tz) {
      els.cityTime.textContent = formatLocalTime(els.cityTime.dataset.tz);
    }
  }, 60 * 1000);

  /* ------------------------------------------------------------------ */
  /* Start                                                               */
  /* ------------------------------------------------------------------ */

  syncUnitButtons();
  locate({ onLoad: true });
})();
