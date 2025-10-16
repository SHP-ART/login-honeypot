# Installation Guide

Vollständige Anleitung zur Installation des Login Honeypot auf einem Server.

## Voraussetzungen

- Linux Server (Ubuntu, Debian, CentOS, etc.)
- Root oder Sudo-Zugriff
- Mindestens 512MB RAM
- Node.js 16.x oder höher

## Schnellstart (für Eilige)

```bash
# 1. Repository klonen
git clone https://github.com/SHP-ART/login-honeypot.git
cd login-honeypot

# 2. Dependencies installieren
npm install

# 3. PM2 installieren (optional, aber empfohlen)
npm install pm2 -g

# 4. Server starten
npm run pm2:start

# Fertig! Server läuft auf http://localhost:3000
```

---

## Detaillierte Installation

### Schritt 1: Node.js installieren

#### Ubuntu/Debian

```bash
# Node.js Repository hinzufügen
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js installieren
sudo apt-get install -y nodejs

# Überprüfen
node -v
npm -v
```

#### CentOS/RHEL

```bash
# Node.js Repository hinzufügen
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Node.js installieren
sudo yum install -y nodejs

# Überprüfen
node -v
npm -v
```

#### macOS

```bash
# Mit Homebrew
brew install node

# Überprüfen
node -v
npm -v
```

---

### Schritt 2: Git installieren

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y git
```

#### CentOS/RHEL

```bash
sudo yum install -y git
```

#### macOS

```bash
brew install git
```

---

### Schritt 3: Repository klonen

```bash
# Navigiere zum gewünschten Verzeichnis
cd /opt  # oder /home/username

# Repository klonen
git clone https://github.com/SHP-ART/login-honeypot.git

# In das Verzeichnis wechseln
cd login-honeypot

# Dateien ansehen
ls -la
```

---

### Schritt 4: Dependencies installieren

```bash
# Alle NPM-Pakete installieren
npm install

# Warten bis Installation abgeschlossen ist
# Dies installiert: express, express-rate-limit, bcryptjs
```

---

### Schritt 5: Server starten

#### Option A: Entwicklung (manuell)

```bash
# Einfacher Start
npm start

# Server läuft auf http://localhost:3000
# Drücke Ctrl+C zum Beenden
```

#### Option B: Produktion (mit PM2 - empfohlen)

```bash
# PM2 global installieren
npm install pm2 -g

# Server mit PM2 starten
npm run pm2:start

# Status prüfen
pm2 status

# Logs ansehen
pm2 logs login-honeypot
```

---

## Konfiguration

### Port ändern

Bearbeite `server.js`:

```javascript
const PORT = 3000;  // Ändere auf gewünschten Port
```

### Firewall konfigurieren

#### Ubuntu/Debian (UFW)

```bash
# Port 3000 öffnen
sudo ufw allow 3000

# Firewall Status
sudo ufw status
```

#### CentOS/RHEL (FirewallD)

```bash
# Port 3000 öffnen
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Status prüfen
sudo firewall-cmd --list-ports
```

---

## Auto-Start beim Server-Neustart

Mit PM2:

```bash
# Startup-Script generieren
pm2 startup

# Folge den Anweisungen (sudo-Befehl ausführen)
# Beispiel: sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u username --hp /home/username

# Aktuelle Prozesse speichern
pm2 save

# Test: Server neu starten
sudo reboot

# Nach Neustart prüfen
pm2 list
```

---

## Mit Domain verwenden (Nginx)

### Nginx installieren

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

#### CentOS/RHEL

```bash
sudo yum install -y nginx
```

### Nginx konfigurieren

```bash
# Neue Config erstellen
sudo nano /etc/nginx/sites-available/login-honeypot
```

Füge folgenden Inhalt ein:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Config aktivieren:

```bash
# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/login-honeypot /etc/nginx/sites-enabled/

# Nginx testen
sudo nginx -t

# Nginx neu starten
sudo systemctl restart nginx
```

### SSL mit Let's Encrypt (optional)

```bash
# Certbot installieren
sudo apt-get install -y certbot python3-certbot-nginx

# SSL Zertifikat erstellen
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Automatische Erneuerung testen
sudo certbot renew --dry-run
```

---

## Logs anzeigen

### Mit PM2

```bash
# Alle Logs
pm2 logs

# Nur dieser Prozess
pm2 logs login-honeypot

# Letzte 100 Zeilen
pm2 logs --lines 100

# Logs löschen
pm2 flush
```

### Anwendungs-Logs

```bash
# Login-Logs ansehen
tail -f login_log.txt

# JSON-Logs ansehen
tail -f login_log.json

# Statistiken
cat stats.json
```

---

## Updates

### Automatisch (empfohlen)

```bash
./update.sh
```

### Manuell

```bash
# Neueste Version holen
git pull origin main

# Dependencies aktualisieren
npm install

# Server neu starten
pm2 restart login-honeypot
```

---

## IP-Blacklist konfigurieren

Bearbeite `blacklist.json`:

```json
{
  "ips": [
    "192.168.1.100",
    "10.0.0.50",
    "203.0.113.42"
  ]
}
```

Nach Änderungen Server neu starten:

```bash
pm2 restart login-honeypot
```

---

## Troubleshooting

### Port bereits in Verwendung

```bash
# Prozess auf Port 3000 finden
sudo lsof -i :3000

# Prozess beenden
sudo kill -9 <PID>
```

### Berechtigungen-Fehler

```bash
# Besitzer ändern
sudo chown -R $USER:$USER /opt/login-honeypot

# Ausführbar machen
chmod +x update.sh
```

### PM2 startet nicht nach Reboot

```bash
# Startup neu konfigurieren
pm2 unstartup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Prozesse speichern
pm2 save
```

### Node.js Out of Memory

```bash
# Mehr Memory für Node.js
pm2 start server.js --node-args="--max-old-space-size=1024"
```

---

## Sicherheits-Tipps

1. **Firewall aktivieren**
   ```bash
   sudo ufw enable
   sudo ufw allow 22  # SSH
   sudo ufw allow 80  # HTTP
   sudo ufw allow 443 # HTTPS
   ```

2. **SSH absichern**
   - Nur Key-basierte Authentifizierung verwenden
   - Root-Login deaktivieren
   - Port ändern

3. **Regelmäßige Updates**
   ```bash
   # System Updates
   sudo apt-get update && sudo apt-get upgrade -y

   # Anwendung Updates
   ./update.sh
   ```

4. **Backups**
   - Automatische Backups sind bereits integriert
   - Befinden sich in `backups/` Ordner
   - Werden automatisch nach 30 Tagen gelöscht

---

## Nützliche Befehle

```bash
# Status prüfen
pm2 status

# Monitoring
pm2 monit

# Logs anzeigen
pm2 logs login-honeypot

# Server neu starten
pm2 restart login-honeypot

# Server stoppen
pm2 stop login-honeypot

# Server löschen
pm2 delete login-honeypot

# Statistiken ansehen
cat stats.json | jq .
```

---

## Support

Bei Problemen:

1. **Logs prüfen**: `pm2 logs login-honeypot`
2. **Status prüfen**: `pm2 status`
3. **GitHub Issues**: https://github.com/SHP-ART/login-honeypot/issues
4. **PM2 Guide**: Siehe [PM2_GUIDE.md](PM2_GUIDE.md)

---

## Deinstallation

```bash
# PM2 stoppen und löschen
pm2 stop login-honeypot
pm2 delete login-honeypot
pm2 save

# Verzeichnis löschen
cd ..
rm -rf login-honeypot

# PM2 deinstallieren (optional)
npm uninstall pm2 -g
```

---

## Was als Nächstes?

- 📖 Lies die [README.md](README.md) für alle Features
- 🚀 Siehe [PM2_GUIDE.md](PM2_GUIDE.md) für erweiterte PM2-Konfiguration
- 🔄 Nutze `./update.sh` für einfache Updates
- 📊 Überwache Logs mit `pm2 logs` oder `pm2 monit`
