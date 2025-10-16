# Login Honeypot

Eine moderne, interaktive Fake-Login-Seite zu Demonstrationszwecken mit erweiterten Sicherheits- und Logging-Features.

## Features

### Design & UX
- 🎨 Moderne, animierte Benutzeroberfläche mit Partikel-Hintergrund
- 🖱️ Interaktive Maus-Reaktion im Hintergrund
- 💫 Smooth Animationen und Glassmorphismus-Effekte
- 📱 Responsive Design

### Logging & Tracking
- 📊 Echtzeit-Statistik (Stunde/Tag/Monat)
- 💾 Dauerhafte Speicherung der Statistiken
- 📝 Automatisches Logging aller Anmeldeversuche
- 🔐 Passwort-Verschlüsselung in JSON-Logs (bcrypt)
- 📦 Automatische Backups alle 24 Stunden

### Sicherheit
- 🚦 Rate Limiting (max. 5 Versuche pro 15 Minuten pro IP)
- 🚫 IP-Blacklist zum Blockieren bestimmter IPs
- 🗑️ Auto-Cleanup alter Backups (> 30 Tage)

## Installation

```bash
npm install
```

## Verwendung

### Entwicklung (lokal)

Server starten:
```bash
npm start
```

Die Anwendung läuft dann auf `http://localhost:3000`

### Produktion (mit PM2)

Für Produktionsumgebungen wird PM2 empfohlen:

```bash
# PM2 installieren
npm install pm2 -g

# Server mit PM2 starten
npm run pm2:start

# Weitere PM2 Befehle
npm run pm2:stop      # Server stoppen
npm run pm2:restart   # Server neu starten
npm run pm2:logs      # Logs anzeigen
npm run pm2:monit     # Monitoring
```

📖 **Vollständige PM2 Anleitung:** Siehe [PM2_GUIDE.md](PM2_GUIDE.md)

## Logs

Alle Anmeldeversuche werden gespeichert in:
- **`login_log.txt`** - Lesbare Textdatei (Klartext)
- **`login_log.json`** - JSON-Format (Passwörter verschlüsselt mit bcrypt)
- **Konsole** - Echtzeit-Ausgabe (Klartext + verschlüsselt)
- **`backups/`** - Automatische Backups aller Logs

Jeder Log-Eintrag enthält:
- Zeitstempel
- IP-Adresse
- Benutzername
- Kennwort (verschlüsselt in JSON)

## Statistik

Die Statistik wird in der unteren rechten Ecke angezeigt und zeigt die Anzahl der fehlgeschlagenen Anmeldeversuche:
- **h** - Letzte Stunde (automatischer Reset nach 60 Minuten)
- **d** - Letzter Tag (automatischer Reset nach 24 Stunden)
- **m** - Letzter Monat (automatischer Reset nach 30 Tagen)

Die Statistik wird persistent gespeichert und bleibt auch nach Server-Neustarts erhalten.

## Sicherheits-Features

### Rate Limiting
Verhindert Brute-Force-Angriffe durch Begrenzung auf maximal 5 Login-Versuche pro 15 Minuten pro IP-Adresse.

### IP-Blacklist
Bestimmte IP-Adressen können dauerhaft blockiert werden:
```json
// blacklist.json
{
  "ips": ["192.168.1.100", "10.0.0.50"]
}
```

### Passwort-Verschlüsselung
- Passwörter in `login_log.json` werden mit bcrypt verschlüsselt (Sicherheits-Faktor: 10)
- `login_log.txt` bleibt im Klartext für einfache Lesbarkeit

### Automatische Backups
- Backup wird beim Server-Start erstellt
- Automatische Backups alle 24 Stunden
- Backups werden im `backups/` Ordner gespeichert
- Alte Backups (älter als 30 Tage) werden automatisch gelöscht

## Konfiguration

### Rate Limiting anpassen
In `server.js`:
```javascript
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Zeit-Fenster
    max: 5, // Max Anzahl Versuche
    // ...
});
```

### Backup-Intervall ändern
In `server.js`:
```javascript
// Standard: 24 Stunden
setInterval(createBackup, 24 * 60 * 60 * 1000);
```

## Warnung

⚠️ **Nur für Bildungs- und Testzwecke verwenden!**

Dieses Tool ist ausschließlich für Sicherheitsforschung, Penetration-Testing (mit Genehmigung) und Bildungszwecke gedacht. Die missbräuchliche Verwendung zur Täuschung realer Benutzer oder zum Sammeln von Credentials ohne Einwilligung ist illegal und unethisch.

## Technologie

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript
- **Animationen**: HTML5 Canvas
- **Styling**: CSS3 mit Glassmorphismus
- **Sicherheit**: express-rate-limit, bcryptjs
- **Speicherung**: JSON-Dateien
