# Loophole — Deploy (S6)

How to put Loophole online: the API, Piston and Caddy on one VPS (ADR-007), the web app on Vercel, data and auth on Supabase. Follow the steps in order. Every command runs on your laptop unless it says **VPS**.

```
Browser ──► Vercel (apps/web) ──HTTPS──► Caddy :443 ──► api:3001 ──► piston:2000
                                         └──────── one VPS, Docker Compose ────────┘
```

## 0. What you need

| Thing        | Notes                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A VPS        | 2 vCPU / 4 GB, Ubuntu 24.04, from any provider. Piston needs a privileged container, which is why this is a VPS and not a PaaS.                         |
| A domain     | For the API, e.g. `api.yourdomain.com`. No domain? Use `<vps-ip-with-dashes>.sslip.io` (e.g. `203-0-113-5.sslip.io`); Caddy can still get HTTPS for it. |
| Vercel       | A free account connected to the GitHub repo.                                                                                                            |
| Supabase     | The existing project. For Gate 1 the app shares it with development; split staging and production later if needed.                                      |
| A Gemini key | From Google AI Studio.                                                                                                                                  |

## 1. Database (laptop)

`apps/api/.env` points at the Supabase project. Apply every migration and load the lessons:

```bash
pnpm --filter @loophole/api db:migrate
pnpm --filter @loophole/api db:seed
```

Both are safe to run again. Repeat them whenever a slice adds a migration or content changes.

## 2. VPS

On a cloud free plan? Do [2a (Google Cloud)](#2a-the-vps-on-google-cloud-free-trial) or [2b (AWS)](#2b-the-vps-on-aws-free-plan) first, then continue here.

**VPS**, as a user with sudo:

```bash
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Firewall: SSH and web only. Piston is bound to 127.0.0.1, so it stays private.
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable

git clone https://github.com/<you>/loophole.git && cd loophole
```

Create the two env files on the VPS. They are git-ignored and never leave the machine.

```bash
cp apps/api/.env.example apps/api/.env   # then edit:
#   DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY  same as your laptop
#   GEMINI_API_KEY                                    your key
#   CORS_ORIGIN=https://<your-app>.vercel.app         exact web origin, no trailing slash
#   PISTON_URL                                        ignored: Compose sets http://piston:2000

cp infra/.env.example infra/.env         # then set API_DOMAIN=api.yourdomain.com
```

Point DNS at the VPS: an `A` record for `API_DOMAIN` → the VPS IP (not needed for sslip.io). Then start everything:

```bash
docker compose -f infra/docker-compose.prod.yml up -d --build
bash infra/install-runtimes.sh            # once; runtimes live in a volume
curl https://$API_DOMAIN/health           # {"status":"ok","piston":"ok"}
```

Caddy fetches the HTTPS certificate on the first request. If that fails, check the DNS record and that ports 80 and 443 are open.

### ADR-018 re-test

```bash
bash infra/check-piston-concurrency.sh
```

Locally, parallel runs crashed Piston's sandbox (7/12 passed). If this VPS shows **parallel: 40/40**, Piston can take overlapping jobs here. Note the result in ADR-018. Raising the limit in `PistonClient` is a follow-up change, which also brings 8-test exercises back under NFR-09.

### 2a. The VPS on Google Cloud (free trial)

Google's free trial gives $300 of credit for 90 days. It needs a card to verify you but does not charge it: when the trial ends the account closes and the server stops, unless you choose to upgrade. The server below (`e2-medium`: 2 vCPU / 4 GB, x86, Mumbai) costs about $30 a month, so 90 days uses about a third of the credit.

1. **Sign up:** open <https://console.cloud.google.com/freetrial>, sign in with Google, and finish the trial signup (country, card verification). A project called "My First Project" is created; that is fine to use.
2. **Open Cloud Shell:** in the console, click the terminal icon (**Activate Cloud Shell**) at the top right. A terminal opens in the browser with `gcloud` ready; every command in this section runs there.
3. **Choose the project and turn on Compute Engine** (the second command takes a minute):

   ```bash
   gcloud config set project "$(gcloud projects list --format='value(projectId)' --limit=1)"
   gcloud services enable compute.googleapis.com
   ```

4. **Reserve a fixed IP**, so the API's address never changes:

   ```bash
   gcloud compute addresses create loophole-ip --region=asia-south1
   gcloud compute addresses describe loophole-ip --region=asia-south1 --format='value(address)'
   ```

   Note the IP it prints, e.g. `34.93.12.34`. Your API domain is that IP with dashes plus `.sslip.io`: `34-93-12-34.sslip.io`.

5. **Open the web ports** (SSH is already open on Google's default network):

   ```bash
   gcloud compute firewall-rules create loophole-web \
     --allow=tcp:80,tcp:443,udp:443 --target-tags=loophole-web
   ```

6. **Create the server.** Ubuntu 24.04, x86 (Piston has no ARM build), with the fixed IP and the firewall tag:

   ```bash
   gcloud compute instances create loophole \
     --zone=asia-south1-a --machine-type=e2-medium \
     --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud \
     --boot-disk-size=30GB --boot-disk-type=pd-balanced \
     --address=loophole-ip --tags=loophole-web
   ```

   If it says the zone is out of capacity, try `--zone=asia-south1-b` or `asia-south1-c`.

7. **Log in to the server:**

   ```bash
   gcloud compute ssh loophole --zone=asia-south1-a
   ```

   Press Enter at the key questions; the prompt changes to `…@loophole`. You are now on the **VPS**. Continue with section 2 below, with two differences:
   - Skip the `ufw` firewall line: Google's firewall from step 5 already does that job.
   - Clone with `git clone https://github.com/Hritik-sharmaa/loophole.git` (the repo is public), and set `API_DOMAIN` in `infra/.env` to the `sslip.io` name from step 4. No DNS step is needed.

To paste secrets into `apps/api/.env` on the server, open it with `nano apps/api/.env`, paste, then press Ctrl+O, Enter, Ctrl+X. If you close the browser tab, Cloud Shell and the SSH session end, but the server and the app keep running. Reconnect with steps 2 and 7.

**Keep an eye on the credit:** Billing → Overview in the console shows what is left and the days remaining. To stop the server without deleting it, run `gcloud compute instances stop loophole --zone=asia-south1-a`. The reserved IP still costs a little while the server is stopped.

### 2b. The VPS on AWS (free plan)

AWS's free plan (accounts created after 15 July 2025) gives $100 of credit at sign-up, plus up to $100 more for onboarding tasks, for 6 months. On the **free plan** AWS does not charge the card; when the credit or the 6 months run out, the account closes unless you upgrade. One Google or AWS trial per person: use it only if you have never had an AWS account.

The server below (`t3.small`: 2 vCPU / 2 GB, x86, Mumbai, 30 GB disk, fixed IP) costs about $23 a month, so $200 covers the 6 months; with only the first $100 it lasts about 4 months.

1. **Sign up** at <https://aws.amazon.com> → **Create an AWS account**: email, account name, the code from the email, a root password.
   - Contact info: **Personal**. Billing: a Visa/Mastercard card with online payments on (AWS may hold about ₹2 to verify it). Phone: verify with the SMS code.
   - When asked for a plan, choose **Free plan**. If no free plan is offered, stop: on a paid plan the server is billed to the card.
   - Support plan: **Basic support - Free**.
2. **Sign in** at <https://console.aws.amazon.com> as the root user. Turn on MFA for the root user when the console suggests it (IAM → Add MFA, with an authenticator app).
3. **Choose Mumbai:** top right, next to your name, pick **Asia Pacific (Mumbai) ap-south-1**. Everything below must be in this region.
4. **Launch the server:** search **EC2** → **Launch instance**.
   - Name: `loophole`.
   - Application and OS image: **Ubuntu** → **Ubuntu Server 24.04 LTS**, architecture **64-bit (x86)** (not Arm: Piston has no Arm build).
   - Instance type: **t3.small**.
   - Key pair: **Create new key pair** → name `loophole`, type ED25519, `.pem` → keep the downloaded file safe (backup way in).
   - Network settings: **Create security group**, tick **Allow SSH traffic from Anywhere**, **Allow HTTPS traffic from the internet** and **Allow HTTP traffic from the internet**. (SSH accepts keys only, never passwords, on Ubuntu images.)
   - Configure storage: **30** GiB, **gp3**.
   - **Launch instance**.
5. **Give it a fixed IP:** EC2 left menu → **Elastic IPs** → **Allocate Elastic IP address** → **Allocate**. Select it → **Actions → Associate Elastic IP address** → Instance: `loophole` → **Associate**. Note the IP, e.g. `13.233.10.20`; your API domain is `13-233-10-20.sslip.io`.
6. **Log in:** EC2 → **Instances** → tick `loophole` → **Connect** → tab **EC2 Instance Connect** → user `ubuntu` → **Connect**. A terminal opens in the browser: you are on the **VPS**.
7. **Add 2 GB of swap** (2 GB of RAM is tight while Docker builds the API):

   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile
   sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

8. Continue with section 2 above, with two differences:
   - Skip the `ufw` line: the security group from step 4 is the firewall.
   - Clone with `git clone https://github.com/Hritik-sharmaa/loophole.git`, and set `API_DOMAIN` to the `sslip.io` name from step 5. No DNS step is needed.

**Credit:** Console Home shows the free-plan widget with credit and days left. Its **Explore AWS** tasks (for example launching an EC2 instance, which you just did, or creating a budget) add credit toward the extra $100. To pause the server, EC2 → Instances → **Instance state → Stop**; the disk and Elastic IP still use a little credit while stopped.

## 3. Web on Vercel

New Project → import the GitHub repo, then:

| Setting          | Value                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Root Directory   | `apps/web` (Vercel installs from the pnpm workspace root automatically)                                 |
| Framework        | Next.js (detected)                                                                                      |
| Environment vars | `NEXT_PUBLIC_API_URL=https://<API_DOMAIN>`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Only these three `NEXT_PUBLIC_*` values go to Vercel; none are secrets (AGENTS.md rule 3). Deploy, and make sure the API's `CORS_ORIGIN` is exactly the production URL Vercel gives you. Preview deployments get other URLs, so their API calls are blocked by CORS. That is expected.

## 4. Supabase Auth

Supabase dashboard → Authentication → URL Configuration:

- **Site URL:** `https://<your-app>.vercel.app`
- **Redirect URLs:** add `https://<your-app>.vercel.app/learn` (sign-in returns there). Keep `http://localhost:3000/learn` for development.

Google sign-in needs no change: Google redirects to Supabase, and Supabase redirects to the URLs above.

## 5. Smoke test (Gate 1)

1. Open the Vercel URL in a private window. Sign up with email, then with Google.
2. Solve lesson 1. You should see "All 4 tests passed", "+10 XP", and node 2 unlocks.
3. Press Hint. A nudge should come back. If the API log shows `AI_UNAVAILABLE`, check `GEMINI_API_KEY`.
4. **Gate 1:** a friend on another network signs up and finishes a lesson.

## Updating

**VPS:**

```bash
cd loophole && git pull
docker compose -f infra/docker-compose.prod.yml up -d --build
```

Run step 1 from your laptop first if the update adds a migration. Vercel redeploys the web app on every push to `main`.

## When something is wrong

| Symptom                                | Look at                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Browser: CORS error                    | `CORS_ORIGIN` on the VPS must equal the web origin exactly; restart the `api` service after editing |
| `/health` says `piston: down`          | `bash infra/install-runtimes.sh`; `docker compose -f infra/docker-compose.prod.yml logs piston`     |
| Run returns 502 `EXECUTOR_UNAVAILABLE` | Same as above                                                                                       |
| API container restarting               | `docker compose -f infra/docker-compose.prod.yml logs api`: a missing env key is named at startup   |
| Sign-in returns to localhost           | Supabase Site URL and Redirect URLs (step 4)                                                        |
