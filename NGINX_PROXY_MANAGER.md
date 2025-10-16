# Nginx Proxy Manager Setup

Anleitung zur Einrichtung des Login Honeypot mit Nginx Proxy Manager (NPM).

## Was ist Nginx Proxy Manager?

Nginx Proxy Manager ist eine grafische Oberfläche für Nginx Reverse Proxy mit:
- Einfache Web-GUI
- Automatische SSL-Zertifikate (Let's Encrypt)
- Keine komplizierte Konfiguration
- Port-Management

## Voraussetzungen

- Nginx Proxy Manager installiert und läuft
- Domain oder Subdomain (z.B. `login.example.com`)
- Login Honeypot läuft auf Port 3000

---

## Schritt-für-Schritt Anleitung

### Schritt 1: Login Honeypot starten

Stelle sicher, dass dein Login Honeypot läuft:

```bash
# Mit PM2
npm run pm2:start

# Status prüfen
pm2 status

# Logs ansehen
pm2 logs login-honeypot
```

Der Server sollte auf Port 3000 laufen.

---

### Schritt 2: Nginx Proxy Manager öffnen

1. Öffne Nginx Proxy Manager in deinem Browser
   - Standard: `http://your-server-ip:81`
   - Standard Login: `admin@example.com` / `changeme`

2. Ändere beim ersten Login das Passwort

---

### Schritt 3: Proxy Host hinzufügen

#### 1. Klicke auf "Proxy Hosts"

![NPM Dashboard](https://i.imgur.com/example.png)

#### 2. Klicke auf "Add Proxy Host"

#### 3. Tab "Details" ausfüllen:

**Domain Names:**
```
login.example.com
```
oder mehrere Domains:
```
login.example.com
honeypot.example.com
```

**Scheme:** `http`

**Forward Hostname/IP:**
```
localhost
```
oder wenn NPM auf anderem Server läuft:
```
192.168.1.100  # IP deines Login Honeypot Servers
```

**Forward Port:**
```
3000
```

**Weitere Einstellungen:**
- ✅ Cache Assets
- ✅ Block Common Exploits
- ✅ Websockets Support (optional)

![Details Tab](https://i.imgur.com/example2.png)

---

### Schritt 4: SSL/HTTPS einrichten (empfohlen)

#### 1. Wechsel zum Tab "SSL"

#### 2. SSL Certificate auswählen:

**Option A: Neues Zertifikat (Let's Encrypt)**

- **SSL Certificate:** Wähle "Request a new SSL Certificate"
- ✅ Force SSL
- ✅ HTTP/2 Support
- ✅ HSTS Enabled
- **Email Address:** deine@email.com
- ✅ I Agree to the Let's Encrypt Terms of Service

**Option B: Bestehendes Zertifikat**

- Wähle ein bereits vorhandenes Zertifikat aus der Liste

![SSL Tab](https://i.imgur.com/example3.png)

#### 3. Klicke auf "Save"

---

### Schritt 5: Erweiterte Konfiguration (Optional)

#### Custom Nginx Configuration

Falls du erweiterte Einstellungen brauchst:

1. Wechsel zum Tab "Advanced"

2. Füge folgende Custom Nginx Configuration hinzu:

```nginx
# Client IP Forwarding (wichtig für IP-Logging!)
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Host $host;

# Timeouts
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# Buffer
proxy_buffering off;
proxy_buffer_size 4k;
proxy_buffers 8 4k;

# Logging
access_log /data/logs/proxy-host-1_access.log proxy;
error_log /data/logs/proxy-host-1_error.log warn;
```

![Advanced Tab](https://i.imgur.com/example4.png)

---

## Wichtig: IP-Adresse korrekt weitergeben

### Problem

Standardmäßig sieht dein Login Honeypot nur die IP von Nginx Proxy Manager, nicht die echte IP des Besuchers.

### Lösung

Der Code ist bereits vorbereitet:

```javascript
// In server.js
const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
```

Dies nutzt automatisch den `X-Forwarded-For` Header von Nginx Proxy Manager.

### Testen

Nach dem Setup:

1. Besuche deine Domain: `https://login.example.com`
2. Mache einen Test-Login
3. Prüfe die Logs:

```bash
pm2 logs login-honeypot
# oder
tail -f login_log.txt
```

Du solltest die echte IP-Adresse sehen, nicht `127.0.0.1` oder die Nginx IP.

---

## Mehrere Domains verwenden

Du kannst mehrere Domains auf denselben Login Honeypot zeigen lassen:

### Option 1: Im gleichen Proxy Host

Domain Names Feld:
```
login.example.com
honeypot.example.com
fake-login.example.com
```

### Option 2: Separate Proxy Hosts

Erstelle für jede Domain einen eigenen Proxy Host mit unterschiedlichen SSL-Zertifikaten.

---

## Rate Limiting in NPM (zusätzlich)

Zusätzlich zum integrierten Rate Limiting kannst du auch in NPM Rate Limiting aktivieren:

### Im "Advanced" Tab:

```nginx
# Rate Limiting Zone definieren
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;

# Rate Limiting anwenden
limit_req zone=login_limit burst=5 nodelay;
limit_req_status 429;

# Custom Error Page für Rate Limit
error_page 429 /429.html;
```

Dies limitiert auf 10 Requests pro Minute pro IP.

---

## Firewall-Einstellungen

### Ports freigeben

Stelle sicher, dass folgende Ports offen sind:

```bash
# HTTP (wird zu HTTPS weitergeleitet)
sudo ufw allow 80/tcp

# HTTPS
sudo ufw allow 443/tcp

# Optional: SSH
sudo ufw allow 22/tcp

# Port 3000 NICHT öffnen (nur intern)
# sudo ufw deny 3000/tcp  # Optional: explizit blocken

# Firewall aktivieren
sudo ufw enable

# Status prüfen
sudo ufw status
```

**Wichtig:** Port 3000 sollte NICHT von außen erreichbar sein!

---

## Zugriff nur über NPM erlauben

### Server nur auf localhost binden

Bearbeite `server.js`:

```javascript
// Alt:
app.listen(PORT, () => {

// Neu:
app.listen(PORT, 'localhost', () => {
```

Dies stellt sicher, dass der Login Honeypot nur über NPM erreichbar ist.

### Firewall-Regel

```bash
# Port 3000 blocken (falls nicht schon geblockt)
sudo ufw deny 3000/tcp

# Prüfen
sudo ufw status numbered
```

---

## Troubleshooting

### 502 Bad Gateway

**Problem:** Nginx Proxy Manager kann Login Honeypot nicht erreichen.

**Lösung:**

1. Prüfe ob Login Honeypot läuft:
   ```bash
   pm2 status
   curl http://localhost:3000
   ```

2. Prüfe Forward Hostname/IP in NPM:
   - Bei gleichem Server: `localhost` oder `127.0.0.1`
   - Bei anderem Server: IP-Adresse des Servers

3. Prüfe Firewall zwischen Servern (falls verschieden)

### 404 Not Found

**Problem:** Domain ist nicht erreichbar.

**Lösung:**

1. Prüfe DNS-Einstellungen:
   ```bash
   nslookup login.example.com
   ```

2. DNS sollte auf die IP deines Nginx Proxy Manager Servers zeigen

3. Warte auf DNS-Propagation (kann bis zu 24h dauern)

### SSL Zertifikat Fehler

**Problem:** Let's Encrypt Zertifikat kann nicht erstellt werden.

**Lösung:**

1. Prüfe DNS: Domain muss auf Server-IP zeigen
2. Ports 80 und 443 müssen offen sein
3. Email-Adresse muss gültig sein
4. Rate Limit von Let's Encrypt (max. 5 Zertifikate pro Woche)

### Falsche IP-Adresse in Logs

**Problem:** Du siehst nur `127.0.0.1` in den Logs.

**Lösung:**

1. Füge im NPM Advanced Tab hinzu:
   ```nginx
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Real-IP $remote_addr;
   ```

2. Server neu starten:
   ```bash
   pm2 restart login-honeypot
   ```

---

## Docker Setup (falls NPM in Docker läuft)

### Docker Compose Beispiel

```yaml
version: '3'
services:
  login-honeypot:
    image: node:20
    container_name: login-honeypot
    working_dir: /app
    volumes:
      - ./login-honeypot:/app
    command: npm start
    ports:
      - "3000:3000"
    restart: unless-stopped
    networks:
      - proxy

  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    container_name: npm
    ports:
      - "80:80"
      - "443:443"
      - "81:81"
    volumes:
      - ./npm/data:/data
      - ./npm/letsencrypt:/etc/letsencrypt
    restart: unless-stopped
    networks:
      - proxy

networks:
  proxy:
    driver: bridge
```

### NPM Konfiguration mit Docker

**Forward Hostname/IP:**
```
login-honeypot
```
(Container Name statt localhost)

**Forward Port:**
```
3000
```

---

## Best Practices

### 1. Immer HTTPS verwenden
- ✅ Force SSL aktivieren
- ✅ HSTS aktivieren
- ✅ HTTP/2 Support

### 2. Sicherheit
- ✅ Block Common Exploits aktivieren
- ✅ Port 3000 nicht von außen erreichbar
- ✅ Rate Limiting nutzen

### 3. Monitoring
- ✅ NPM Access Logs prüfen
- ✅ Login Honeypot Logs überwachen
- ✅ PM2 Monitoring nutzen

### 4. Backups
- ✅ NPM Konfiguration sichern (`/data` Ordner)
- ✅ Login Honeypot Logs sichern (automatisch integriert)

---

## Weitere Konfigurationen

### Custom 404 Page

Im NPM Advanced Tab:

```nginx
error_page 404 /404.html;
location = /404.html {
    internal;
}
```

### Access Control (IP Whitelist)

Im NPM Advanced Tab:

```nginx
# Nur bestimmte IPs erlauben
allow 192.168.1.0/24;
allow 10.0.0.0/8;
deny all;
```

### Geoblocking

Im NPM Advanced Tab (erfordert GeoIP):

```nginx
# Nur bestimmte Länder erlauben
if ($geoip_country_code !~ (DE|AT|CH)) {
    return 403;
}
```

---

## Nützliche Links

- Nginx Proxy Manager: https://nginxproxymanager.com/
- GitHub: https://github.com/NginxProxyManager/nginx-proxy-manager
- Dokumentation: https://nginxproxymanager.com/guide/

---

## Zusammenfassung

### Schnell-Setup Checklist

- [ ] Login Honeypot läuft auf Port 3000
- [ ] NPM Proxy Host erstellt
- [ ] Domain zeigt auf Server-IP
- [ ] SSL-Zertifikat eingerichtet
- [ ] Force SSL aktiviert
- [ ] X-Forwarded-For Header konfiguriert
- [ ] Port 3000 nicht von außen erreichbar
- [ ] Test-Login durchgeführt
- [ ] IP-Adresse in Logs korrekt

### NPM Einstellungen im Überblick

```
Domain: login.example.com
Scheme: http
Forward Host: localhost
Forward Port: 3000
Cache Assets: ✅
Block Exploits: ✅
Force SSL: ✅
HTTP/2: ✅
HSTS: ✅
```

Viel Erfolg! 🚀
