# Mini PC Runner Plan

This is the future path for running Codex/OpenClaw from your own ChatGPT/Codex account without paying OpenAI API usage from GitHub-hosted Actions.

## Current State

The repo should stay in no-API mode until the mini PC exists:

- GitHub-hosted Actions run deterministic audits only.
- Audits open/update GitHub issues.
- No OpenAI API key is required.
- No Codex/OpenClaw OAuth credential is stored in GitHub.
- Supabase is not mutated by the weekly audit workflow.

## Target State

After you buy and configure a mini PC:

- The mini PC runs a GitHub self-hosted runner.
- Codex or OpenClaw is installed and authenticated locally with your ChatGPT/Codex account.
- A separate workflow targets `runs-on: [self-hosted, salsa-runner]`.
- The model produces structured JSON candidate updates.
- Repo scripts validate the JSON.
- A restricted Supabase credential inserts/updates public festival rows.
- Any delete/conflict/low-confidence case opens a manual issue instead.

## Hardware

Good enough:

- Mini PC with x86_64 CPU.
- 8 GB RAM minimum; 16 GB preferred.
- 128 GB SSD minimum.
- Wired ethernet preferred.
- Ubuntu Server LTS.

Avoid for first setup:

- ARM devices unless you know Codex/OpenClaw supports your exact install path.
- A primary laptop that sleeps frequently.

## Setup Checklist

1. Install Ubuntu Server LTS.
2. Enable SSH during install.
3. SSH from your Windows machine:

```powershell
ssh your_user@mini_pc_ip
```

4. Install base tools:

```bash
sudo apt update
sudo apt install -y git curl nodejs npm
```

5. Install the GitHub self-hosted runner:
   - GitHub repo -> Settings -> Actions -> Runners.
   - New self-hosted runner.
   - Choose Linux x64.
   - Copy the commands GitHub gives you.

6. Add a runner label:

Use `salsa-runner` so workflows can target:

```yaml
runs-on: [self-hosted, salsa-runner]
```

7. Install the runner as a service:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

8. Install Codex or OpenClaw.

Codex CLI path:

```bash
npm install -g @openai/codex
codex --login
```

OpenClaw path, if used:

```bash
openclaw onboard --auth-choice openai-codex
```

9. Test the runner with a small workflow before enabling any database writes.

## Security Rules

- Do not store Codex/OpenClaw OAuth credentials in GitHub Secrets.
- Do not run the self-hosted runner as root if avoidable.
- Do not expose the runner to the public internet.
- Keep the mini PC patched.
- Give Supabase automation a restricted credential, not the service-role key.
- Grant insert/update/select only on public event tables.
- Grant no delete permission.
- Grant no access to private trip or review tables.

## Future Workflow Shape

Create this only after the mini PC is ready:

```yaml
name: Self-hosted Codex event agent

on:
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  event-agent:
    runs-on: [self-hosted, salsa-runner]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: node scripts/select-event-candidates.mjs --mode next-edition
      - run: openclaw run --input audit/candidates.json --skill salsa-edition-refresh
      - run: node scripts/validate-event-agent-output.mjs
      - run: node scripts/apply-event-upserts.mjs
```

Do not enable this on a schedule until it has passed manual `workflow_dispatch` tests.

## Rollout

1. Keep no-API weekly audits running on GitHub-hosted runners.
2. Set up mini PC and self-hosted runner.
3. Add a test workflow that only prints versions.
4. Add a dry-run Codex/OpenClaw workflow that comments proposed JSON on an issue.
5. Add restricted Supabase role.
6. Enable write workflow manually.
7. Only then consider Sunday scheduling.

