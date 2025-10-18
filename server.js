const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Trust proxy - wichtig für Nginx Proxy Manager und korrekte IP-Erkennung
app.set('trust proxy', true);

const PORT = 3000;
const STATS_FILE = 'stats.json';
const BLACKLIST_FILE = 'blacklist.json';
const BACKUP_DIR = 'backups';

// E-Mail Konfiguration
let emailTransporter = null;
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

if (EMAIL_ENABLED) {
    emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true für Port 465, false für andere Ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    // Verbindung testen
    emailTransporter.verify((error, success) => {
        if (error) {
            console.error('E-Mail Konfiguration Fehler:', error);
            console.log('E-Mail-Benachrichtigungen sind deaktiviert');
        } else {
            console.log('✓ E-Mail Server bereit für Benachrichtigungen');
        }
    });
}

// Backup-Verzeichnis erstellen
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

// Blacklist laden
let blacklist = { ips: [] };
if (fs.existsSync(BLACKLIST_FILE)) {
    try {
        blacklist = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
    } catch (err) {
        console.error('Fehler beim Laden der Blacklist:', err);
    }
}

// IP-Blacklist Middleware
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (blacklist.ips.includes(ip)) {
        console.log(`Blockierte IP: ${ip}`);
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
});

// Rate Limiting: Max 5 Versuche pro 15 Minuten pro IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    max: 5, // Max 5 Requests
    message: { error: 'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.' },
    standardHeaders: true,
    legacyHeaders: false,
    // Trust proxy ist konfiguriert - wir validieren die IP durch Nginx
    validate: { trustProxy: false }
});

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

// E-Mail Benachrichtigung senden
async function sendEmailNotification(loginData) {
    if (!EMAIL_ENABLED || !emailTransporter) {
        return;
    }

    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: process.env.ALERT_EMAIL,
            subject: `🚨 Login-Versuch erkannt - ${loginData.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ff4444;">🚨 Neuer Login-Versuch</h2>
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
                        <p><strong>Zeit:</strong> ${loginData.timestamp}</p>
                        <p><strong>IP-Adresse:</strong> ${loginData.ip}</p>
                        <p><strong>Benutzername:</strong> ${loginData.name}</p>
                        <p><strong>Kennwort:</strong> ${loginData.kennwort}</p>
                    </div>
                    <div style="margin-top: 20px; padding: 15px; background-color: #e3f2fd; border-radius: 5px;">
                        <h3 style="color: #1976d2; margin-top: 0;">Aktuelle Statistik</h3>
                        <p><strong>Letzte Stunde:</strong> ${loginData.stats.hour}</p>
                        <p><strong>Letzter Tag:</strong> ${loginData.stats.day}</p>
                        <p><strong>Letzter Monat:</strong> ${loginData.stats.month}</p>
                    </div>
                    <p style="margin-top: 20px; color: #666; font-size: 12px;">
                        Diese E-Mail wurde automatisch von Ihrem Login-Honeypot generiert.
                    </p>
                </div>
            `,
            text: `
🚨 Neuer Login-Versuch

Zeit: ${loginData.timestamp}
IP-Adresse: ${loginData.ip}
Benutzername: ${loginData.name}
Kennwort: ${loginData.kennwort}

Aktuelle Statistik:
- Letzte Stunde: ${loginData.stats.hour}
- Letzter Tag: ${loginData.stats.day}
- Letzter Monat: ${loginData.stats.month}

Diese E-Mail wurde automatisch von Ihrem Login-Honeypot generiert.
            `
        };

        await emailTransporter.sendMail(mailOptions);
        console.log('✓ E-Mail-Benachrichtigung gesendet an:', process.env.ALERT_EMAIL);
    } catch (error) {
        console.error('Fehler beim Senden der E-Mail:', error.message);
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

// Login Route mit Rate Limiting
app.post('/login', loginLimiter, async (req, res) => {
    const { name, kennwort } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toISOString();

    // Passwort verschlüsseln
    const encryptedPassword = await bcrypt.hash(kennwort, 10);

    // Log-Eintrag erstellen (mit verschlüsseltem Passwort)
    const logEntry = {
        timestamp: timestamp,
        ip: ip,
        name: name,
        kennwort_encrypted: encryptedPassword
    };

    // In Datei schreiben (Klartext für einfache Lesbarkeit)
    const logLine = `[${timestamp}] IP: ${ip} | Name: ${name} | Kennwort: ${kennwort}\n`;

    fs.appendFile('login_log.txt', logLine, (err) => {
        if (err) {
            console.error('Fehler beim Schreiben der Log-Datei:', err);
        }
    });

    // Als JSON speichern (mit verschlüsseltem Passwort)
    fs.appendFile('login_log.json', JSON.stringify(logEntry) + ',\n', (err) => {
        if (err) {
            console.error('Fehler beim Schreiben der JSON-Log-Datei:', err);
        }
    });

    // Console Log (Klartext)
    console.log('=== Neue Anmeldung ===');
    console.log('Zeit:', timestamp);
    console.log('IP:', ip);
    console.log('Name:', name);
    console.log('Kennwort:', kennwort);
    console.log('Kennwort (verschlüsselt):', encryptedPassword);
    console.log('=====================\n');

    // Statistik aktualisieren
    checkAndResetStats();
    stats.hour.count++;
    stats.day.count++;
    stats.month.count++;
    saveStats();

    // E-Mail-Benachrichtigung senden
    sendEmailNotification({
        timestamp,
        ip,
        name,
        kennwort,
        stats: {
            hour: stats.hour.count,
            day: stats.day.count,
            month: stats.month.count
        }
    });

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

// Automatisches Backup alle 24 Stunden
function createBackup() {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupFiles = [
        { src: 'login_log.txt', dest: `${BACKUP_DIR}/login_log_${timestamp}.txt` },
        { src: 'login_log.json', dest: `${BACKUP_DIR}/login_log_${timestamp}.json` },
        { src: 'stats.json', dest: `${BACKUP_DIR}/stats_${timestamp}.json` }
    ];

    backupFiles.forEach(({ src, dest }) => {
        if (fs.existsSync(src)) {
            fs.copyFile(src, dest, (err) => {
                if (err) {
                    console.error(`Fehler beim Backup von ${src}:`, err);
                } else {
                    console.log(`Backup erstellt: ${dest}`);
                }
            });
        }
    });
}

// Backup alle 24 Stunden erstellen
setInterval(createBackup, 24 * 60 * 60 * 1000);

// Backup beim Server-Start
createBackup();

// Alte Backups löschen (älter als 30 Tage)
function cleanOldBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) return;

        files.forEach(file => {
            const filePath = path.join(BACKUP_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;

                if (stats.mtimeMs < thirtyDaysAgo) {
                    fs.unlink(filePath, (err) => {
                        if (!err) {
                            console.log(`Altes Backup gelöscht: ${file}`);
                        }
                    });
                }
            });
        });
    });
}

// Alte Backups beim Start bereinigen
cleanOldBackups();

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
    console.log('Drücke Ctrl+C zum Beenden');
    console.log('\n=== Sicherheits-Features aktiv ===');
    console.log('✓ Rate Limiting: Max 5 Versuche pro 15 Minuten');
    console.log('✓ IP-Blacklist aktiv');
    console.log('✓ Passwort-Verschlüsselung in JSON-Logs');
    console.log('✓ Automatische Backups alle 24h');
    if (EMAIL_ENABLED) {
        console.log('✓ E-Mail-Benachrichtigungen aktiviert');
    } else {
        console.log('○ E-Mail-Benachrichtigungen deaktiviert');
    }
    console.log('===================================\n');
});
