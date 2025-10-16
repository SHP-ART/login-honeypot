# PM2 Deployment Guide

Anleitung zum Deployen des Login Honeypot mit PM2 für Produktionsumgebungen.

## Was ist PM2?

PM2 ist ein Production Process Manager für Node.js Anwendungen mit:
- Automatischer Neustart bei Abstürzen
- Load Balancing
- Log Management
- Prozess-Monitoring
- Auto-Start beim Server-Neustart

## Installation

### PM2 global installieren

```bash
npm install pm2 -g
```

### PM2 überprüfen

```bash
pm2 -v
```

## Server starten

### Einfacher Start

```bash
pm2 start server.js --name login-honeypot
```

### Start mit Konfiguration (empfohlen)

```bash
pm2 start ecosystem.config.js
```

## PM2 Befehle

### Server verwalten

```bash
# Server starten
pm2 start server.js --name login-honeypot

# Server stoppen
pm2 stop login-honeypot

# Server neu starten
pm2 restart login-honeypot

# Server löschen
pm2 delete login-honeypot

# Alle Prozesse anzeigen
pm2 list

# Details eines Prozesses anzeigen
pm2 show login-honeypot
```

### Logs ansehen

```bash
# Alle Logs anzeigen
pm2 logs

# Logs eines bestimmten Prozesses
pm2 logs login-honeypot

# Logs in Echtzeit verfolgen
pm2 logs --lines 100

# Logs löschen
pm2 flush
```

### Monitoring

```bash
# CPU/Memory Monitoring
pm2 monit

# Dashboard im Browser (PM2 Plus - optional)
pm2 plus
```

## Auto-Start beim Server-Neustart

### Startup-Script erstellen

```bash
# Generiert ein Startup-Script für dein System
pm2 startup

# Folge den angezeigten Anweisungen (z.B. sudo Befehl ausführen)
```

### Aktuelle Prozess-Liste speichern

```bash
# Speichert alle laufenden PM2 Prozesse
pm2 save
```

### Test

```bash
# Server neu starten und prüfen ob PM2 automatisch startet
sudo reboot

# Nach Neustart prüfen
pm2 list
```

## Ecosystem Config (ecosystem.config.js)

Erstelle eine `ecosystem.config.js` Datei im Projekt-Root:

```javascript
module.exports = {
  apps: [{
    name: 'login-honeypot',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
```

### Mit Ecosystem starten

```bash
pm2 start ecosystem.config.js
```

## Best Practices

### 1. Environment Variables

Erstelle eine `.env` Datei:
```
NODE_ENV=production
PORT=3000
```

### 2. Log Rotation

PM2 hat automatische Log-Rotation:

```bash
pm2 install pm2-logrotate

# Konfiguration
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 3. Memory Monitoring

```bash
# Automatischer Restart bei Memory-Limit
pm2 start server.js --max-memory-restart 500M
```

### 4. Cluster Mode (für mehrere CPU-Kerne)

```bash
# Startet mehrere Instanzen
pm2 start server.js -i max
```

## Nginx Reverse Proxy (Optional)

Für Produktionsumgebungen empfohlen:

### Nginx installieren

```bash
sudo apt update
sudo apt install nginx
```

### Nginx Config (`/etc/nginx/sites-available/login-honeypot`)

```nginx
server {
    listen 80;
    server_name your-domain.com;

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

### Aktivieren

```bash
sudo ln -s /etc/nginx/sites-available/login-honeypot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Troubleshooting

### Server läuft nicht

```bash
# Status prüfen
pm2 status

# Logs ansehen
pm2 logs login-honeypot --lines 50

# Server neu starten
pm2 restart login-honeypot
```

### Port bereits in Verwendung

```bash
# Prozess auf Port 3000 finden
lsof -i :3000

# Prozess beenden
kill -9 <PID>
```

### PM2 stoppt nach Server-Neustart

```bash
# Startup-Script neu erstellen
pm2 unstartup
pm2 startup

# Prozesse speichern
pm2 save
```

## Nützliche PM2 Befehle

```bash
# Alle Prozesse stoppen
pm2 stop all

# Alle Prozesse löschen
pm2 delete all

# Alle Logs löschen
pm2 flush

# PM2 aktualisieren
pm2 update

# PM2 Daemon neu starten
pm2 kill
pm2 resurrect
```

## Performance Optimierung

### Node.js Memory erhöhen

```bash
pm2 start server.js --node-args="--max-old-space-size=4096"
```

### Cluster Mode mit Load Balancing

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'login-honeypot',
    script: './server.js',
    instances: 'max', // Nutzt alle CPU-Kerne
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
```

## Weitere Ressourcen

- PM2 Dokumentation: https://pm2.keymetrics.io/
- PM2 Plus (Monitoring): https://app.pm2.io/

## Support

Bei Problemen:
1. Logs prüfen: `pm2 logs login-honeypot`
2. Status prüfen: `pm2 status`
3. Prozess neu starten: `pm2 restart login-honeypot`
4. GitHub Issues: https://github.com/SHP-ART/login-honeypot/issues
