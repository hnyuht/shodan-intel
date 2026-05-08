# ShodanIntel — Threat Intelligence Dashboard

A cybersecurity threat intelligence dashboard combining the **Shodan API** with **Claude AI** for real-time internet exposure analysis.

```
shodan-intel/
├── index.html          # Main dashboard (metrics, charts, worker telemetry)
├── chat.html           # AI Analyst chat interface
├── css/
│   └── dashboard.css   # Terminal-aesthetic dark theme
├── js/
│   ├── dashboard.js    # Dashboard logic, charts, live scan
│   └── chat.js         # Claude + Shodan agentic loop
└── README.md
```

## Features

### Dashboard (`index.html`)
- **Metric cards** — Total scanned, Critical/High exposure, RDP/SSH/DB counts
- **Live worker telemetry** — Visual grid showing active scan workers
- **Risk distribution donut chart** — Critical / High / Medium / Low breakdown
- **14-day exposure timeline** — Stacked bar chart per risk tier
- **Results table** — IP, org, country, ports, risk tag, last seen

### AI Analyst (`chat.html`)
- Natural language queries powered by Claude
- Agentic tool loop — Claude calls Shodan multiple times per question
- 4 Shodan tools: `host_info`, `search`, `count`, `dns_resolve`
- Risk-labeled responses with attacker perspective analysis

## Quick Start

### Option A — Open directly in browser
No build step needed. Just open `index.html` in any modern browser.

### Option B — Local server (recommended)
```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```
Then visit `http://localhost:8080`

## API Keys

You need two API keys for full functionality:

| Key | Where to get | Used for |
|-----|-------------|----------|
| **Shodan API** | [account.shodan.io](https://account.shodan.io) | Live internet scan data |
| **Anthropic API** | [console.anthropic.com](https://console.anthropic.com) | AI analysis (chat page only) |

Keys are saved to `localStorage` — no backend required.

> ⚠️ For production use, proxy API calls through a backend to protect your keys.

## Example Queries (AI Analyst)

```
Which hosts have the most open ports and highest risk?
Show me organizations with RDP port 3389 exposed to the internet
Check if [your company] is exposed — search org:"Company Name"
Find Elasticsearch instances on port 9200 with no authentication
What ICS/SCADA systems are exposed online?
Find hosts in the US with MongoDB open and no auth
```

## Risk Port Reference

| Risk | Ports |
|------|-------|
| 🔴 CRITICAL | 23 (Telnet), 445 (SMB), 3389 (RDP), 5900 (VNC), 2375 (Docker API) |
| 🟠 HIGH | 22 (SSH), 3306 (MySQL), 5432 (PostgreSQL), 27017 (MongoDB), 6379 (Redis), 9200 (Elasticsearch) |
| 🟡 MEDIUM | 8080, 8443, 21 (FTP), 25 (SMTP), 8888 (Jupyter) |
| 🟢 LOW | 80, 443, 53, 123 |

## Tech Stack

- **Vanilla HTML/CSS/JS** — no framework, no build step
- **Chart.js** — donut and timeline charts
- **Shodan REST API** — internet scan data
- **Anthropic API** — Claude claude-sonnet-4-20250514 with tool use

## Ethical Use

This tool is for **authorized security research only**. Only query IP ranges and organizations you are permitted to assess. Shodan data is publicly available but its use is governed by [Shodan's Terms of Service](https://www.shodan.io/about/terms).

## License

MIT
