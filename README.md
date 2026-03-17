# 🍽️ FINVIA Lunch Navigator

Tägliche Mittagsangebote aus Restaurants rund ums Büro – automatisch gescrapt und übersichtlich dargestellt.

## Restaurants

| Restaurant | Typ | URL |
|---|---|---|
| Metzgerei Illing | 🤖 automatisch (Wochenplan) | https://www.metzgerei-illing.de/Speiseplan/ |
| Sandwicher | 🤖 automatisch (täglich) | https://www.sandwicher.de |
| fresh74 | ✍️ manuell (Admin-Interface) | https://www.fresh74.de/menue/ |

---

## Setup (einmalig)

### 1. Repo klonen
```bash
git clone https://github.com/DEIN-USERNAME/finvia-lunch-navigator.git
cd finvia-lunch-navigator
```

### 2. Abhängigkeiten installieren
```bash
npm install
```

### 3. Umgebungsvariablen einrichten
```bash
cp .env.example .env.local
```
Dann `.env.local` öffnen und Passwort setzen:
```
ADMIN_PASSWORD=dein-passwort
CRON_SECRET=dein-geheimer-key
```

### 4. Entwicklungsserver starten
```bash
npm run dev
```
→ App läuft auf http://localhost:3000

---

## Deployment auf Vercel (empfohlen)

### 1. GitHub Repo erstellen
```bash
git init
git add .
git commit -m "Initial commit – FINVIA Lunch Navigator"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/finvia-lunch-navigator.git
git push -u origin main
```

### 2. Auf Vercel deployen
1. https://vercel.com aufrufen
2. „New Project" → GitHub Repo auswählen
3. Environment Variables setzen:
   - `ADMIN_PASSWORD` → dein Passwort
   - `CRON_SECRET` → dein geheimer Key
4. Deploy klicken ✅

### 3. Automatisches Scraping einrichten (Vercel Cron)
`vercel.json` ins Projekt-Root:
```json
{
  "crons": [
    {
      "path": "/api/scrape?secret=DEIN_CRON_SECRET",
      "schedule": "0 9 * * 1-5"
    }
  ]
}
```
→ Scrapt jeden Werktag um 9:00 Uhr automatisch.

---

## Tägliche Nutzung

### Automatische Restaurants (Illing & Sandwicher)
Werden täglich um 9:00 Uhr automatisch aktualisiert.
Manuell neu laden: Button „Menüs neu laden" in der App.

### fresh74 (manuell)
1. https://deine-app.vercel.app/admin aufrufen
2. Passwort eingeben
3. Wochenkarte von https://www.fresh74.de/menue/ abtippen
4. Jeden Montag aktualisieren (dauert ~2 Minuten)

---

## Projektstruktur

```
src/
├── app/
│   ├── page.tsx              # Hauptseite (Lunch Navigator)
│   ├── admin/
│   │   └── page.tsx          # Admin-Interface für fresh74
│   └── api/
│       ├── scrape/route.ts   # Scraping-Endpoint
│       ├── menu/route.ts     # Menüs abrufen
│       └── admin/route.ts    # Manuelle Einträge speichern
├── lib/
│   ├── types.ts              # Datentypen & Restaurant-Registry
│   ├── store.ts              # Datei-basierter Datenspeicher
│   └── scrapers/
│       ├── illing.ts         # Scraper für Metzgerei Illing
│       └── sandwicher.ts     # Scraper für Sandwicher
data/                         # Gespeicherte Menüs (JSON, wird von Git ignoriert)
```

---

## Weitere Restaurants hinzufügen

1. In `src/lib/types.ts` das Restaurant zur `RESTAURANTS`-Liste hinzufügen
2. Für automatisches Scraping: neuen Scraper in `src/lib/scrapers/` anlegen
3. In `src/app/api/scrape/route.ts` den neuen Scraper importieren und aufrufen
4. Für manuelles Eintragen: im Admin-Interface die `restaurantId` ergänzen

---

## Tech Stack

- **Next.js 14** – Framework
- **TypeScript** – Typsicherheit  
- **Cheerio** – HTML-Scraping
- **Vercel** – Hosting & Cron Jobs
- **JSON-Dateien** – Datenspeicherung (kein Datenbank-Setup nötig)
