#!/bin/bash

# Login Honeypot Update Script
# Automatisches Update von GitHub mit PM2 Integration

# Farben für Terminal-Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Login Honeypot Update Script        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Funktion zum Prüfen ob Befehl existiert
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Prüfe ob Git installiert ist
if ! command_exists git; then
    echo -e "${RED}✗ Git ist nicht installiert!${NC}"
    exit 1
fi

# Prüfe ob Node.js installiert ist
if ! command_exists node; then
    echo -e "${RED}✗ Node.js ist nicht installiert!${NC}"
    exit 1
fi

# Prüfe ob PM2 verwendet wird
PM2_RUNNING=false
if command_exists pm2; then
    if pm2 list | grep -q "login-honeypot"; then
        PM2_RUNNING=true
        echo -e "${GREEN}✓ PM2 ist installiert und läuft${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}1. Aktuellen Status prüfen...${NC}"

# Prüfe auf ungespeicherte Änderungen
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}✗ Es gibt ungespeicherte Änderungen!${NC}"
    echo ""
    git status -s
    echo ""
    read -p "Möchten Sie diese Änderungen verwerfen? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Änderungen werden verworfen...${NC}"
        git reset --hard HEAD
        git clean -fd
    else
        echo -e "${RED}Update abgebrochen.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}2. Updates von GitHub holen...${NC}"

# Hole neueste Änderungen von GitHub
git fetch origin

# Prüfe ob Updates verfügbar sind
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ $LOCAL = $REMOTE ]; then
    echo -e "${GREEN}✓ Bereits auf dem neuesten Stand!${NC}"
    exit 0
fi

echo -e "${GREEN}✓ Updates gefunden!${NC}"
echo ""

# Zeige Änderungen an
echo -e "${YELLOW}Änderungen:${NC}"
git log --oneline $LOCAL..$REMOTE
echo ""

read -p "Möchten Sie fortfahren? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ -n $REPLY ]]; then
    echo -e "${RED}Update abgebrochen.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}3. PM2 stoppen (falls aktiv)...${NC}"

# Stoppe PM2 wenn aktiv
if [ "$PM2_RUNNING" = true ]; then
    pm2 stop login-honeypot
    echo -e "${GREEN}✓ PM2 gestoppt${NC}"
else
    echo -e "${BLUE}ℹ PM2 ist nicht aktiv${NC}"
fi

echo ""
echo -e "${YELLOW}4. Repository aktualisieren...${NC}"

# Pull von GitHub
git pull origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Repository aktualisiert${NC}"
else
    echo -e "${RED}✗ Fehler beim Aktualisieren des Repositories${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}5. Dependencies installieren...${NC}"

# NPM Dependencies aktualisieren
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installiert${NC}"
else
    echo -e "${RED}✗ Fehler beim Installieren der Dependencies${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}6. Server starten...${NC}"

# Starte Server wieder
if [ "$PM2_RUNNING" = true ]; then
    pm2 restart login-honeypot
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PM2 neu gestartet${NC}"
        echo ""
        pm2 status login-honeypot
    else
        echo -e "${RED}✗ Fehler beim Starten von PM2${NC}"
        exit 1
    fi
else
    echo -e "${BLUE}ℹ PM2 war nicht aktiv. Starten Sie den Server manuell:${NC}"
    echo -e "${BLUE}  → npm start${NC}"
    echo -e "${BLUE}  → oder: npm run pm2:start${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Update erfolgreich abgeschlossen!   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Zeige aktuelle Version
echo -e "${BLUE}Aktuelle Version:${NC}"
git log -1 --oneline
echo ""

# Zeige nützliche Befehle
echo -e "${BLUE}Nützliche Befehle:${NC}"
echo -e "  ${YELLOW}npm run pm2:logs${NC}     - Logs anzeigen"
echo -e "  ${YELLOW}npm run pm2:monit${NC}    - Monitoring"
echo -e "  ${YELLOW}npm run pm2:restart${NC}  - Neustart"
echo ""
