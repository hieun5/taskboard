#!/usr/bin/env bash
# One-time Azure setup for Topic Board. Read docs/AZURE.md first.
#
# Creates, in one resource group:
#   - Azure Database for PostgreSQL Flexible Server (Burstable B1ms) + database
#   - Storage account with a private "attachments" container
#   - Communication Services + Email (Azure-managed sender domain)
#   - Container Apps environment + the app (scales to zero when idle)
#
# Usage:  IMAGE=ghcr.io/<owner>/<repo>:latest GHCR_USER=<github-user> GHCR_TOKEN=<token> \
#         ADMIN_EMAILS=you@example.com bash infra/azure/setup.sh
#
# Review every command before running. Requires: az CLI (logged in with `az login`), openssl.
set -euo pipefail

: "${IMAGE:?Set IMAGE to the image pushed by the Deploy workflow, e.g. ghcr.io/owner/taskboard:latest}"
: "${GHCR_USER:?Set GHCR_USER to your GitHub username}"
: "${GHCR_TOKEN:?Set GHCR_TOKEN to a GitHub token with read:packages}"
: "${ADMIN_EMAILS:?Set ADMIN_EMAILS to your email address}"

PREFIX="${PREFIX:-topicboard}"
LOCATION="${LOCATION:-eastus}"
RG="${RG:-rg-$PREFIX}"
SUFFIX="${SUFFIX:-$(openssl rand -hex 3)}"
PG_SERVER="${PG_SERVER:-pg-$PREFIX-$SUFFIX}"
PG_ADMIN="${PG_ADMIN:-tbadmin}"
PG_PASSWORD="${PG_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=')Aa1}"
STORAGE="${STORAGE:-st${PREFIX}${SUFFIX}}"
EMAIL_SVC="${EMAIL_SVC:-email-$PREFIX-$SUFFIX}"
ACS="${ACS:-acs-$PREFIX-$SUFFIX}"
CAE="${CAE:-cae-$PREFIX}"
APP="${APP:-$PREFIX}"
SESSION_SECRET="$(openssl rand -base64 48)"

echo "==> Resource group $RG in $LOCATION"
az group create -n "$RG" -l "$LOCATION" -o none

echo "==> PostgreSQL $PG_SERVER (this takes a few minutes)"
az postgres flexible-server create -g "$RG" -n "$PG_SERVER" -l "$LOCATION" \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 \
  --admin-user "$PG_ADMIN" --admin-password "$PG_PASSWORD" \
  --public-access 0.0.0.0 --yes -o none
az postgres flexible-server db create -g "$RG" -s "$PG_SERVER" -d taskboard -o none
DATABASE_URL="postgres://$PG_ADMIN:$PG_PASSWORD@$PG_SERVER.postgres.database.azure.com:5432/taskboard?sslmode=require"

echo "==> Storage $STORAGE"
az storage account create -g "$RG" -n "$STORAGE" -l "$LOCATION" --sku Standard_LRS --kind StorageV2 \
  --allow-blob-public-access false --min-tls-version TLS1_2 -o none
STORAGE_KEY="$(az storage account keys list -g "$RG" -n "$STORAGE" --query '[0].value' -o tsv)"
az storage container create --name attachments --account-name "$STORAGE" --account-key "$STORAGE_KEY" --public-access off -o none

echo "==> Email (Communication Services)"
az extension add --name communication --upgrade --only-show-errors
az communication email create -n "$EMAIL_SVC" -g "$RG" --location global --data-location unitedstates -o none
az communication email domain create --domain-name AzureManagedDomain --email-service-name "$EMAIL_SVC" -g "$RG" \
  --location global --domain-management AzureManaged -o none
DOMAIN_ID="$(az communication email domain show --domain-name AzureManagedDomain --email-service-name "$EMAIL_SVC" -g "$RG" --query id -o tsv)"
SENDER_DOMAIN="$(az communication email domain show --domain-name AzureManagedDomain --email-service-name "$EMAIL_SVC" -g "$RG" --query mailFromSenderDomain -o tsv)"
az communication create -n "$ACS" -g "$RG" --location global --data-location unitedstates -o none
az communication update -n "$ACS" -g "$RG" --linked-domains "$DOMAIN_ID" -o none
ACS_CONNECTION_STRING="$(az communication list-key -n "$ACS" -g "$RG" --query primaryConnectionString -o tsv)"
MAIL_FROM="DoNotReply@$SENDER_DOMAIN"

echo "==> Container Apps"
az extension add --name containerapp --upgrade --only-show-errors
az provider register -n Microsoft.App --wait -o none
az provider register -n Microsoft.OperationalInsights --wait -o none
az containerapp env create -n "$CAE" -g "$RG" -l "$LOCATION" -o none
az containerapp create -n "$APP" -g "$RG" --environment "$CAE" --image "$IMAGE" \
  --registry-server ghcr.io --registry-username "$GHCR_USER" --registry-password "$GHCR_TOKEN" \
  --target-port 3000 --ingress external --min-replicas 0 --max-replicas 1 --cpu 0.5 --memory 1.0Gi \
  --secrets "database-url=$DATABASE_URL" "session-secret=$SESSION_SECRET" "storage-key=$STORAGE_KEY" "acs-connection=$ACS_CONNECTION_STRING" \
  --env-vars DATABASE_URL=secretref:database-url SESSION_SECRET=secretref:session-secret \
    STORAGE_DRIVER=azure AZURE_STORAGE_ACCOUNT="$STORAGE" AZURE_STORAGE_KEY=secretref:storage-key AZURE_STORAGE_CONTAINER=attachments \
    MAIL_DRIVER=azure MAIL_FROM="$MAIL_FROM" ACS_CONNECTION_STRING=secretref:acs-connection \
    ADMIN_EMAILS="$ADMIN_EMAILS" MAX_UPLOAD_MB=25 -o none
FQDN="$(az containerapp show -n "$APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)"
az containerapp update -n "$APP" -g "$RG" --set-env-vars APP_URL="https://$FQDN" -o none

echo "==> Let the browser upload straight to Blob Storage from https://$FQDN"
az storage cors add --services b --methods GET PUT OPTIONS --origins "https://$FQDN" \
  --allowed-headers "*" --exposed-headers "*" --max-age 3600 --account-name "$STORAGE" --account-key "$STORAGE_KEY"

cat <<DONE

Done. Topic Board: https://$FQDN
Sign in with $ADMIN_EMAILS (the first visit after idle takes a few seconds while the app wakes up).

Keep these somewhere safe (a password manager), they are not stored anywhere else:
  PostgreSQL admin password: $PG_PASSWORD

For the Deploy workflow, add GitHub repository variables:
  AZURE_RESOURCE_GROUP=$RG
  AZURE_CONTAINER_APP=$APP
and the AZURE_CREDENTIALS secret (see docs/AZURE.md).
DONE
