# Deploying Topic Board to Azure

This uses your **Azure for Students** subscription. Everything lives in one resource group, so you can
delete it all with one command if you ever want to start over.

| Piece | Azure service | Notes |
|---|---|---|
| App | Azure Container Apps | Scales to zero when idle; the first visit after a quiet spell takes a few seconds. |
| Database | Azure Database for PostgreSQL – Flexible Server, Burstable B1ms | Check your student free-service allowance in the portal. |
| Files | Azure Blob Storage, private container | Browsers upload and download through 15/5-minute signed (SAS) URLs. |
| Email | Azure Communication Services Email | Uses a free Azure-managed sender address (`DoNotReply@….azurecomm.net`). |
| Image | GitHub Container Registry (ghcr.io) | Free for your repository. |

Prices and free amounts change; check **Cost Management** in the Azure portal after the first week.

## One-time setup

1. **Install and sign in to the Azure CLI**: <https://learn.microsoft.com/cli/azure/install-azure-cli>, then `az login`.
2. **Build the first image.** In GitHub, open *Actions → Deploy to Azure → Run workflow*. With no Azure secrets yet,
   it only builds and pushes `ghcr.io/<owner>/<repo>:latest`.
3. **Create a GitHub token** (Settings → Developer settings → Personal access tokens → classic) with only
   `read:packages`, so Azure can pull the private image.
4. **Run the setup script** from the repository root:

   ```bash
   IMAGE=ghcr.io/<owner>/<repo>:latest GHCR_USER=<github-user> GHCR_TOKEN=<token> \
   ADMIN_EMAILS=<your-email> bash infra/azure/setup.sh
   ```

   It prints the site's URL and the database password at the end. Save the password in a password manager.
   Read through the script first; every command is plain `az` CLI.
5. **Let the Deploy workflow update the app**:

   ```bash
   az ad sp create-for-rbac --name topicboard-deploy --role contributor \
     --scopes /subscriptions/<subscription-id>/resourceGroups/rg-topicboard --json-auth
   ```

   Put the JSON it prints into a repository secret named `AZURE_CREDENTIALS`, and add repository
   *variables* `AZURE_RESOURCE_GROUP` and `AZURE_CONTAINER_APP` with the values the setup script printed.

After that, *Run workflow* builds, pushes and rolls out the new version. Database migrations run
automatically when the container starts.

## Inviting people

Sign in with the address in `ADMIN_EMAILS`, open **Members**, and add your uncle's email. He signs in
with a link sent to that address; there are no passwords.

## Environment variables (set by the script)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (`?sslmode=require`) |
| `APP_URL` | Public `https://` URL, used in emails and for secure cookies |
| `SESSION_SECRET` | Signs upload links; 32+ random characters |
| `ADMIN_EMAILS` | Comma-separated emails that are always allowed in, as admins |
| `MAIL_DRIVER=azure`, `MAIL_FROM`, `ACS_CONNECTION_STRING` | Sending email |
| `STORAGE_DRIVER=azure`, `AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_KEY`, `AZURE_STORAGE_CONTAINER` | File storage |
| `MAX_UPLOAD_MB` | Per-file limit (default 25) |

Secrets are stored as Container App secrets, never in the repository.

## Deleting everything

```bash
az group delete -n rg-topicboard
```
