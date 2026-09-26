# Stillsky — Calm Weather

A peaceful, ambient weather app built with plain **HTML, CSS, and vanilla JavaScript**. It pulls live data from the free [Open-Meteo](https://open-meteo.com/) API, so you don't need an API key, an account, or a build step.

## Features

- **City search** using Open-Meteo's geocoding API
- **Current conditions:** temperature, condition, humidity, wind speed, feels-like, and today's high/low
- **5-day forecast** shown as a horizontally scrolling row of frosted-glass cards
- **Auto-detect location** on load when you allow it. If you decline, you can search manually, and the app reopens the last city you viewed.
- **°C / °F toggle.** Wind switches between km/h and mph along with it.
- **Ambient background that follows the weather**
  - Gradient skies for clear, partly cloudy, night, cloudy, fog, rain, storm, and snow, which crossfade smoothly
  - Drifting clouds, twinkling stars at night, and a sun or moon glow
  - Canvas rain and snow particles, plus occasional soft lightning during storms
- **Glassmorphism** main card, a floating "breathing" weather icon, and hover lifts on forecast cards
- **Loading and error states:** a friendly "couldn't find that place" message with **Try again** and **Search another city** buttons
- **Responsive** on mobile and desktop, and respects `prefers-reduced-motion`

## Project structure

```
.
├── index.html   # Markup: background scene, search, and state views
├── style.css    # Scenes, glass UI, animations, responsive rules
├── script.js    # API calls, rendering, icons, particle canvas
└── README.md
```

## Run locally

Because it's a static site, any static file server works:

```bash
# Option 1: Python
python3 -m http.server 3000

# Option 2: Node
npx serve .
```

Then open http://localhost:3000.

> Geolocation only works on `https://` or `localhost`. It won't work if you open `index.html` straight from the file system (`file://`). Search still works either way.

## APIs used (all free, no key)

| Purpose | Endpoint |
| --- | --- |
| City search | `https://geocoding-api.open-meteo.com/v1/search` |
| Forecast | `https://api.open-meteo.com/v1/forecast` |
| Name for your GPS location | `https://api.bigdatacloud.net/data/reverse-geocode-client` |

Open-Meteo is free for non-commercial use. Keep the attribution link in the footer.

---

## Deploy for free on GitHub Pages

### 1. Create a repository

1. Go to https://github.com/new.
2. Name it, for example `stillsky`, and set it to **Public**. Pages is free for public repos.
3. Click **Create repository**.

### 2. Upload the files

**Option A: in the browser (no Git needed)**

1. In the new repo, click **Add file → Upload files**.
2. Drag in `index.html`, `style.css`, `script.js`, and `README.md`.
3. Click **Commit changes**.

**Option B: from the command line**

```bash
git init
git add index.html style.css script.js README.md
git commit -m "Initial commit: Stillsky weather app"
git branch -M main
git remote add origin https://github.com/<your-username>/stillsky.git
git push -u origin main
```

### 3. Turn on GitHub Pages

1. In the repo, open **Settings → Pages**.
2. Under **Build and deployment → Source**, pick **Deploy from a branch**.
3. Set **Branch** to `main` and the folder to `/ (root)`, then click **Save**.

### 4. Open your site

After about a minute, the Pages settings will show your URL:

```
https://<your-username>.github.io/stillsky/
```

GitHub Pages serves over HTTPS, so location detection works there. Every push to `main` redeploys the site automatically.

### Troubleshooting

- **404 right after enabling Pages:** wait 1–2 minutes and refresh. Also check that `index.html` is in the repo root, not in a subfolder.
- **Styles not loading:** make sure the file names match exactly, including case (`style.css`, `script.js`).
- **Location prompt never shows up:** you may have blocked it earlier. Click the lock icon in the address bar and allow Location.
