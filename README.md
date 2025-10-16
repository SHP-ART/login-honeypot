# Login Honeypot

Eine moderne, interaktive Fake-Login-Seite zu Demonstrationszwecken.

## Features

- Moderne, animierte Benutzeroberfläche mit Partikel-Hintergrund
- Interaktive Maus-Reaktion im Hintergrund
- Automatisches Logging aller Anmeldeversuche
- Echtzeit-Statistik (Stunde/Tag/Monat)
- Dauerhafte Speicherung der Statistiken
- Responsive Design

## Installation

```bash
npm install
```

## Verwendung

Server starten:
```bash
npm start
```

Die Anwendung läuft dann auf `http://localhost:3000`

## Logs

Alle Anmeldeversuche werden gespeichert in:
- `login_log.txt` - Lesbare Textdatei
- `login_log.json` - JSON-Format
- Konsole - Echtzeit-Ausgabe

Jeder Log-Eintrag enthält:
- Zeitstempel
- IP-Adresse
- Benutzername
- Kennwort

## Statistik

Die Statistik zeigt die Anzahl der fehlgeschlagenen Anmeldeversuche:
- **h** - Letzte Stunde
- **d** - Letzter Tag
- **m** - Letzter Monat

## Warnung

⚠️ Nur für Bildungs- und Testzwecke verwenden!

## Technologie

- Node.js + Express
- Vanilla JavaScript
- HTML5 Canvas für Animationen
- CSS3 mit Glassmorphismus
