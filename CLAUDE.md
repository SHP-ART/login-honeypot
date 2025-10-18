# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **login honeypot** - a defensive security tool designed to log and monitor unauthorized login attempts. It presents a fake login interface that captures credentials (for security research/testing purposes only) and provides analytics on attempted intrusions.

**IMPORTANT**: This is a defensive security tool for authorized use only (penetration testing, security research, education). Never enhance this tool for malicious purposes or credential harvesting without explicit authorization.

## Architecture

### Backend (server.js)
- **Express.js server** running on port 3000
- **Middleware stack**:
  1. IP Blacklist check (blocks banned IPs via `blacklist.json`)
  2. Rate limiting (5 attempts per 15 minutes per IP via `express-rate-limit`)
  3. Static file serving for frontend
  4. JSON body parser

- **Key features**:
  - Logs all attempts to `login_log.txt` (plaintext) and `login_log.json` (bcrypt-encrypted passwords)
  - Time-based statistics tracking (hour/day/month) with auto-reset in `stats.json`
  - Automatic backups every 24 hours to `backups/` directory
  - Auto-cleanup of backups older than 30 days
  - Always returns authentication failure to maintain honeypot facade

### Frontend (index.html + style.css)
- **HTML5 Canvas particle system** with mouse-reactive animations
- **Glassmorphism UI** with smooth transitions
- **Live statistics display** in bottom-right corner (h/d/m counters)
- **Disappearing effect** after login submission - fades to black screen

### Process Management
- **PM2 configuration** in `ecosystem.config.js`:
  - Single instance (fork mode)
  - Auto-restart on crashes
  - 500MB memory limit
  - Logs to `./logs/` directory

## Common Commands

### Development
```bash
npm start                 # Start server locally (port 3000)
```

### Production (PM2)
```bash
npm run pm2:start        # Start with PM2
npm run pm2:stop         # Stop PM2 process
npm run pm2:restart      # Restart PM2 process
npm run pm2:logs         # View logs
npm run pm2:monit        # Monitor process
```

### Updates
```bash
./update.sh              # Automated update script (handles PM2, backups, git pull)
```

## Key Configuration Points

### Rate Limiting (server.js:39-45)
```javascript
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // Time window
    max: 5,                      // Max attempts
    // ...
});
```

### Backup Interval (server.js:183)
```javascript
setInterval(createBackup, 24 * 60 * 60 * 1000);  // 24 hours
```

### IP Blacklist (blacklist.json)
```json
{
  "ips": ["192.168.1.100", "10.0.0.50"]
}
```

## Data Storage

- **login_log.txt** - Human-readable plaintext logs (timestamp, IP, name, password)
- **login_log.json** - JSON logs with bcrypt-encrypted passwords (factor: 10)
- **stats.json** - Persistent statistics with timestamps for auto-reset logic
- **blacklist.json** - List of permanently blocked IP addresses
- **backups/** - Automated daily backups (auto-cleaned after 30 days)

## Statistics System

Statistics are tracked with time-based auto-reset:
- **Hour** - Resets after 60 minutes (server.js:78-80)
- **Day** - Resets after 24 hours (server.js:81-83)
- **Month** - Resets after 30 days (server.js:84-86)

Each counter includes a `timestamp` field to determine when the time window started. The `checkAndResetStats()` function (server.js:72-87) compares current time against these timestamps.

## Security Features

1. **Rate Limiting** - Prevents brute force attacks (5 attempts/15 min per IP)
2. **IP Blacklist** - Permanent blocking of malicious IPs
3. **Password Encryption** - bcrypt hashing (factor 10) in JSON logs
4. **Automatic Backups** - Daily backups with 30-day retention
5. **IP Tracking** - Captures both direct and proxy IPs (`x-forwarded-for`)

## Frontend Animation System

The particle system (index.html:55-136) creates 100 particles that:
- Move with randomized velocity
- React to mouse position (repel within 150px radius)
- Connect with lines when within 120px of each other
- Bounce off canvas edges

## Deployment Notes

- Designed for **Nginx Proxy Manager** setup (see NGINX_PROXY_MANAGER.md)
- PM2 logs stored in `./logs/` directory (ensure directory exists or PM2 creates it)
- Server always returns failure to maintain honeypot authenticity (server.js:148-157)
- Frontend fades to black after submission to simulate loading/processing

## Testing Considerations

When testing changes:
1. Rate limiting will block after 5 attempts - wait 15 minutes or restart server
2. Check both `login_log.txt` and `login_log.json` for proper logging
3. Verify statistics increment and display correctly in UI
4. Test IP blacklist by adding your IP to `blacklist.json`
5. Backup functionality runs on startup - check `backups/` directory
