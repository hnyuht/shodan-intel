/* =============================================
   ShodanIntel AI Analyst Chat JS
   ============================================= */

let shodanKey = localStorage.getItem('shodanKey') || '';
let anthropicKey = localStorage.getItem('anthropicKey') || '';
let conversationHistory = [];
let isLoading = false;

// Pre-fill saved keys
if (shodanKey) document.getElementById('shodanKeyInput').value = shodanKey;
if (anthropicKey) document.getElementById('anthropicKeyInput').value = anthropicKey;
if (shodanKey && anthropicKey) {
  const s = document.getElementById('keyStatus');
  s.textContent = '✓ Both keys connected — AI analyst ready';
  s.style.color = 'var(--green)';
}

// Clock
function updateClock() {
  const t = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false });
  const el = document.getElementById('clock');
  if (el) el.textContent = t + ' ET';
}
setInterval(updateClock, 1000);
updateClock();

function saveKeys() {
  shodanKey = document.getElementById('shodanKeyInput').value.trim();
  anthropicKey = document.getElementById('anthropicKeyInput').value.trim();
  if (shodanKey) localStorage.setItem('shodanKey', shodanKey);
  if (anthropicKey) localStorage.setItem('anthropicKey', anthropicKey);
  const s = document.getElementById('keyStatus');
  if (shodanKey && anthropicKey) {
    s.textContent = '✓ Both keys saved — AI analyst ready';
    s.style.color = 'var(--green)';
  } else {
    s.textContent = 'Please enter both keys to enable AI queries';
    s.style.color = 'var(--amber)';
  }
}

function fillInput(text) {
  document.getElementById('chatInput').value = text;
  document.getElementById('chatInput').focus();
}

document.getElementById('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function addMessage(role, html, isPreFormatted = false) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  const label = role === 'ai' ? 'AI' : 'YOU';
  div.innerHTML = `
    <div class="chat-avatar ${role}">${label}</div>
    <div class="chat-bubble">${isPreFormatted ? html : escHtml(html)}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div.querySelector('.chat-bubble');
}

function showTyping() {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.id = 'typingIndicator';
  div.className = 'chat-msg ai';
  div.innerHTML = `
    <div class="chat-avatar ai">AI</div>
    <div class="chat-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

function formatResponse(text) {
  let html = escHtml(text);
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--green)">$1</strong>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg-0);padding:1px 5px;font-size:11px;color:var(--amber)">$1</code>');
  // Code blocks
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c) => `<pre>${c.trim()}</pre>`);
  // Risk labels
  html = html.replace(/\bCRITICAL\b/g, '<span class="risk-tag risk-critical">CRITICAL</span>');
  html = html.replace(/\bHIGH RISK\b/gi, '<span class="risk-tag risk-high">HIGH RISK</span>');
  html = html.replace(/\bMEDIUM RISK\b/gi, '<span class="risk-tag risk-medium">MEDIUM RISK</span>');
  html = html.replace(/\bLOW RISK\b/gi, '<span class="risk-tag risk-low">LOW RISK</span>');
  // Newlines
  html = html.replace(/\n/g, '<br>');
  return html;
}

// Shodan tools definition for Claude
const TOOLS = [
  {
    name: "shodan_host_info",
    description: "Get all open ports and services for a specific IP address",
    input_schema: {
      type: "object",
      properties: {
        ip: { type: "string", description: "IP address to look up" }
      },
      required: ["ip"]
    }
  },
  {
    name: "shodan_search",
    description: "Search Shodan for hosts. Use filters like port:3389, org:\"Company\", country:US, vuln:CVE-XXXX, product:apache, os:windows. Returns matching hosts with ports and org info.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Shodan search query with filters" },
        facets: { type: "string", description: "Comma-separated facets e.g. 'org,country,port'" },
        page: { type: "number", description: "Result page number (default 1)" }
      },
      required: ["query"]
    }
  },
  {
    name: "shodan_count",
    description: "Count results for a Shodan query without spending credits. Use this first to get scale before a full search.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Shodan search query" },
        facets: { type: "string", description: "Facets to aggregate e.g. 'org:20,country:10'" }
      },
      required: ["query"]
    }
  },
  {
    name: "shodan_dns_resolve",
    description: "Resolve a hostname to an IP address",
    input_schema: {
      type: "object",
      properties: {
        hostnames: { type: "string", description: "Comma-separated hostnames to resolve" }
      },
      required: ["hostnames"]
    }
  }
];

const SYSTEM_PROMPT = `You are SHODANINTEL, an elite cybersecurity threat intelligence analyst with real-time access to the Shodan internet scan database.

You help security professionals answer questions like:
- "Which hosts have the most risk?" → search for hosts with critical ports, rank by danger
- "Show orgs with RDP open" → port:3389, get org facets
- "Is [company] exposed?" → org:"Company Name", audit all open ports
- "Find vulnerable hosts" → use vuln: filter or search by dangerous product/version

RISK PORT TAXONOMY:
CRITICAL: 23 (Telnet), 445 (SMB), 3389 (RDP), 5900 (VNC), 4444 (backdoor), 2375 (Docker API)  
HIGH: 22 (SSH), 3306 (MySQL), 5432 (PostgreSQL), 27017 (MongoDB), 6379 (Redis), 9200 (Elasticsearch), 11211 (Memcached), 1433 (MSSQL), 1521 (Oracle)
MEDIUM: 8080, 8443, 21 (FTP), 25 (SMTP), 8888 (Jupyter)
LOW: 80, 443, 53, 123

WORKFLOW:
1. Use shodan_count first to gauge scale (free, no credits used)
2. Use shodan_search for full results with facets to find top orgs/countries
3. Use shodan_host_info for deep dive on specific IPs
4. Synthesize findings with clear risk assessment

Always:
- Explain what each exposure means to an attacker
- Rank findings by severity  
- Be specific: "MongoDB on port 27017 with no auth = any attacker can read/delete all data"
- Warn about particularly dangerous combinations

Shodan API Key: ${shodanKey || 'NOT PROVIDED — tell user to add key'}`;

async function callShodan(toolName, input) {
  if (!shodanKey) return { error: 'No Shodan API key — please add it in the header bar' };

  const base = 'https://api.shodan.io';
  const key = shodanKey;

  try {
    if (toolName === 'shodan_host_info') {
      const r = await fetch(`${base}/shodan/host/${input.ip}?key=${key}`);
      return await r.json();
    }
    if (toolName === 'shodan_search') {
      const p = new URLSearchParams({ key, query: input.query });
      if (input.facets) p.set('facets', input.facets);
      if (input.page) p.set('page', input.page);
      p.set('minify', 'true');
      const r = await fetch(`${base}/shodan/host/search?${p}`);
      return await r.json();
    }
    if (toolName === 'shodan_count') {
      const p = new URLSearchParams({ key, query: input.query });
      if (input.facets) p.set('facets', input.facets);
      const r = await fetch(`${base}/shodan/host/count?${p}`);
      return await r.json();
    }
    if (toolName === 'shodan_dns_resolve') {
      const p = new URLSearchParams({ key, hostnames: input.hostnames });
      const r = await fetch(`${base}/dns/resolve?${p}`);
      return await r.json();
    }
  } catch (e) {
    return { error: e.message };
  }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || isLoading) return;

  if (!anthropicKey) {
    addMessage('ai', '<span style="color:var(--red)">Please add your Anthropic API key in the header bar to use the AI analyst.</span>', true);
    return;
  }

  input.value = '';
  isLoading = true;
  document.getElementById('sendBtn').disabled = true;

  addMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });
  showTyping();

  try {
    let messages = [...conversationHistory];
    let continueLoop = true;

    while (continueLoop) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages
        })
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error.message);

      if (data.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: data.content });
        const toolResults = [];

        for (const block of data.content) {
          if (block.type === 'tool_use') {
            // Show tool call indicator
            const indicator = document.createElement('div');
            indicator.className = 'chat-msg ai';
            indicator.innerHTML = `
              <div class="chat-avatar ai">AI</div>
              <div class="chat-bubble" style="font-size:10px;color:var(--text-dim);padding:6px 12px;">
                &gt; ${block.name}(${JSON.stringify(block.input).slice(0, 80)}...)
              </div>
            `;
            document.getElementById('chatMessages').appendChild(indicator);
            document.getElementById('chatMessages').scrollTop = 999999;

            const result = await callShodan(block.name, block.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result).slice(0, 10000)
            });
          }
        }
        messages.push({ role: 'user', content: toolResults });

      } else {
        continueLoop = false;
        removeTyping();
        const textBlock = data.content?.find(b => b.type === 'text');
        if (textBlock) {
          addMessage('ai', formatResponse(textBlock.text), true);
          conversationHistory = messages;
          conversationHistory.push({ role: 'assistant', content: data.content });
        }
      }
    }
  } catch (err) {
    removeTyping();
    addMessage('ai', `<span style="color:var(--red)">Error: ${escHtml(err.message)}</span>`, true);
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
  input.focus();
}

// Helper: escape HTML (used in formatResponse via escHtml ref)
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
