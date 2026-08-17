# Deploy Northold to a VPS from GHCR

Image name: `ghcr.io/<github-user-or-org>/<repo>` (lowercase).
Compose lives in `deploy/`. Mongo stays on the Docker network; Caddy terminates TLS.

## 1. GitHub

1. Create a GitHub repo and push this project (`master` or `main`).
2. Repo **Settings → Actions → General → Workflow permissions**: Read and write.
3. Optional Actions **Variables** (baked into the image at build time):
   - `NEXT_PUBLIC_APP_NAME`
   - `NEXT_PUBLIC_MAINNET_RPC_URL`
   - `NEXT_PUBLIC_SEPOLIA_RPC_URL`
   - `NEXT_PUBLIC_MAINNET_WS_URL`
   - `NEXT_PUBLIC_SEPOLIA_WS_URL`
4. Push to the default branch (or **Actions → GHCR → Run workflow**). Wait until the image exists under **Packages**.
5. Package visibility: public, or keep private and use a PAT with `read:packages` on the VPS.

Auto-deploy after a successful image build: set Actions variables `VPS_HOST`, `VPS_USER`, `VPS_PATH` (absolute path to this `deploy/` folder on the VPS) and secret `VPS_SSH_KEY` (private key). Leave `VPS_HOST` unset to skip SSH deploy.

## 2. VPS

Needs Docker Engine + Compose plugin, ports 80 and 443 open, and DNS for `DOMAIN` pointing at the box.

```bash
# copy this folder onto the server, e.g.
#   scp -r deploy user@vps:~/northold
cd ~/northold
cp env.example .env
nano .env   # GHCR_IMAGE, DOMAIN, ACME_EMAIL, AUTH_SECRET, ADMIN_*
chmod +x pull.sh
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 48
```

Log in to GHCR (private packages only):

```bash
# classic PAT or fine-grained token: read:packages
echo YOUR_GHCR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Start:

```bash
docker compose up -d
docker compose logs -f app
```

Later updates (after CI publishes a new `latest`):

```bash
./pull.sh
```

Admin login is `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`, created only when the database is empty.

## 3. Atlas instead of local Mongo

Set `MONGODB_URI` in `.env` to your Atlas URL and remove the `mongo` service (or leave it unused). Compose currently forces `MONGODB_URI=mongodb://mongo:27017/northold`; override that `environment:` entry if you switch.

## 4. Notes

- Lab/Anvil tooling is not in the image. Production is the Next app + Mongo.
- Changing `NEXT_PUBLIC_*` requires a new image build, not just a compose restart.
- First Caddy start issues a Let's Encrypt cert; the hostname must already resolve here.
