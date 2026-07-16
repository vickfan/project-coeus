# VPS Deployment Checklist

Deploy the **Telegram capture bot** on your Hetzner (or any Linux) VPS. Weaving runs in **GitHub Actions**, not on the VPS.

**Mother repo:** `git@github.com:vickfan/project-coeus.git`  
**Notes repo:** private repo named in `COEUS_NOTES_REPO` (e.g. `coeus-notes`)

---

## Before you start

- [ ] VPS with **Docker** and **Docker Compose** installed
- [ ] SSH access to the VPS
- [ ] **Deploy key** or SSH key on VPS that can `git pull` from `project-coeus` (read-only is enough)
- [ ] Telegram bot token from [@BotFather](https://t.me/BotFather)
- [ ] Your Telegram numeric user ID (e.g. from [@userinfobot](https://t.me/userinfobot))
- [ ] GitHub **PAT** (`COEUS_NOTES_TOKEN`) with **Contents: Read and write** on the private notes repo
- [ ] Notes repo cutover done (`index.json` = `[]`, test cards removed) — see [tracking/v1-todos.md](../tracking/v1-todos.md)

---

## 1. One-time VPS setup

SSH into the VPS, then:

```bash
# Install Docker (Debian/Ubuntu example — skip if already installed)
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker "$USER"
# Log out and back in so docker group applies
```

```bash
# Clone mother repo (SSH)
git clone git@github.com:vickfan/project-coeus.git
cd project-coeus

# Notes submodule is NOT required for capture — Octokit pushes to GitHub directly.
# Local inbox only needs this directory:
mkdir -p notes/raw-notes
```

```bash
# Environment file
cp .env.sample .env
nano .env   # or vim
```

### Required `.env` values (VPS)

```bash
COEUS_USERNAME=vickfan
COEUS_NOTES_REPO=coeus-notes          # your private notes repo name
TELEGRAM_BOT_TOKEN=...
TELEGRAM_USER_ID=123456789            # your numeric Telegram ID

COEUS_NOTES_TOKEN=ghp_...             # PAT: contents read/write on notes repo

# Enable GitHub sync from VPS (only when ready)
NODE_ENV=PROD
```

**Optional on VPS** (bot does not run weave; safe to omit):

```bash
# LLM_PROVIDER=cloudflare
# CLOUDFLARE_ACCOUNT_ID=...
# CLOUDFLARE_API_TOKEN=...
```

Leave `ENCRYPTION_ENABLED` unset or anything other than `true` for v1 plaintext.

- [ ] `.env` filled in and saved
- [ ] `chmod 600 .env` (recommended)

---

## 2. Build and start the bot

```bash
cd ~/project-coeus

docker compose build
docker compose up -d
```

```bash
# Confirm running
docker compose ps
docker compose logs -f --tail=50
```

Expected log line: `Coeus catcher bot is flying... 🚀`

- [ ] Container `coeus-bot-local` is **Up**
- [ ] No crash loop in logs
- [ ] No `TELEGRAM_USER_ID is required` error

---

## 3. GitHub Actions (weave layer)

On **project-coeus** GitHub repo → **Settings → Secrets and variables → Actions**:

### Secrets

| Secret | Purpose |
|--------|---------|
| `COEUS_NOTES_TOKEN` | Checkout + push private notes repo |
| `CLOUDFLARE_ACCOUNT_ID` | Metadata LLM in weave |
| `CLOUDFLARE_API_TOKEN` | Metadata LLM in weave |

### Variables

| Variable | Example |
|----------|---------|
| `COEUS_USERNAME` | `vickfan` |
| `COEUS_NOTES_REPO` | `coeus-notes` |

- [ ] Secrets and variables set
- [ ] Run **Actions → Coeus Daily Distill and Sync → Run workflow** (`workflow_dispatch`)
- [ ] Workflow completes green

Cron stays **commented** until you are happy with manual runs. To enable nightly weave at 03:00 HKT, uncomment in `.github/workflows/distill.yml`:

```yaml
- cron: '0 19 * * *'
```

---

## 4. Smoke test (production)

With `NODE_ENV=PROD`:

- [ ] Message the bot from **your** Telegram account → saved locally under `notes/raw-notes/`
- [ ] Same message → file appears in private notes repo on GitHub (`raw-notes/...`)
- [ ] Message from another account → **no reply** (auth middleware)
- [ ] Upload a `.md` file → lands in `raw-notes/{filename}.md` + GitHub sync
- [ ] Trigger `workflow_dispatch` → inbox processed → cards in `persistent/`, `index.json` updated

Quick checks on VPS:

```bash
ls -la notes/raw-notes/
docker compose logs --tail=20
```

---

## 5. Deploy updates (git pull + rebuild)

Run on the VPS whenever you ship changes to `main`:

```bash
cd ~/project-coeus

git fetch origin
git pull origin main

docker compose build
docker compose up -d

docker compose logs -f --tail=30
```

If `.env.sample` changed, merge new keys into your local `.env` manually (never commit `.env`).

- [ ] `git pull` clean (no local conflicts)
- [ ] Rebuild + restart completed
- [ ] Bot still responds after update

---

## 6. Troubleshooting

| Symptom | Check |
|---------|--------|
| Bot silent for everyone | `TELEGRAM_BOT_TOKEN`; container running |
| Bot silent for you only | `TELEGRAM_USER_ID` matches your numeric ID |
| Local save OK, no GitHub file | `NODE_ENV=PROD`; `COEUS_*` vars; PAT scopes |
| `COEUS_NOTES_TOKEN is required` | Token missing from `.env` or not passed in compose |
| Sync fails, Telegram alert | PAT expired or wrong repo name; check `docker compose logs` |
| `git pull` permission denied | VPS SSH key added to GitHub (Deploy keys or your account) |
| Two bots fighting | Only one VPS (or one `docker compose up`) per bot token |

Restart after env change:

```bash
docker compose down
docker compose up -d
```

---

## What runs where

| Component | Where |
|-----------|--------|
| Telegram capture | VPS Docker (`telegramBot.mjs`) |
| Push `raw-notes/` to GitHub | VPS → Octokit when `NODE_ENV=PROD` |
| Weave (LLM + embeddings + links) | GitHub Actions → `weave-batch.mjs` |
| Obsidian vault | Private notes repo |

---

## Related docs

- [cloudflare-llm-setup.md](cloudflare-llm-setup.md) — Cloudflare credentials (Actions + optional local weave)
- [../tracking/v1-todos.md](../tracking/v1-todos.md) — manual verify checklist
- [../spec/v1-build-spec.md](../spec/v1-build-spec.md) — env var reference
