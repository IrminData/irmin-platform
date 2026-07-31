# Google Drive Connector

Irmin connector for Google Drive — pull file metadata and contents from Google Drive into versioned LakeFS storage, and push files back.

## Authentication

Google Drive uses **OAuth 2.0 + PKCE** as a **static-client** connector. Unlike Linear (which uses Dynamic Client Registration), Google does **not** support RFC 7591 DCR. An admin must register one OAuth app per environment in Google Cloud Console.

### OAuth App Registration (one-time per environment)

Before anyone can connect Google Drive to Irmin, an admin must create an OAuth app in Google Cloud Console. This is a **one-time** setup per Irmin environment (dev / staging / prod).

#### Step 1 — Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note the **Project ID** (you'll use it later for the consent screen)

#### Step 2 — Enable the Google Drive API

1. Navigate to **APIs & Services > Library**
2. Search for "Google Drive API"
3. Click **Enable**

#### Step 3 — Configure the OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**
2. Choose **External** (or **Internal** if using Google Workspace in your org)
3. Fill in:
   - **App name**: `Irmin` (or `Irmin [env]` for non-production)
   - **User support email**: Your team's support address
   - **Developer contact email**: Your team's contact address
4. Click **Save and Continue**

5. **Scopes**: Click **Add or Remove Scopes**, then add:
   - `.../auth/drive.readonly` — Read file metadata and contents
   - (Optional) `.../auth/drive.file` — Create app-owned files (needed for push)
   - (Optional) `.../auth/drive` — Full access (needed for push to non-app-owned files)
6. Click **Save and Continue**

7. **Test users**: Add any Google accounts that will test the integration before the app is published
8. Click **Save and Continue**

9. **Publish the app**: On the OAuth consent screen summary page, click **Publish App**.
   > ⚠️ **Without publishing, refresh tokens expire after 7 days.** Published apps with a verified status get indefinite refresh tokens.

#### Step 4 — Create OAuth Credentials

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth Client ID**
3. Application type: **Web application**
4. **Name**: `Irmin Google Drive Connector`
5. **Authorized redirect URIs**: Add exactly:
   ```
   https://api.irmin.app/api/v1/oauth/callback
   ```
   (Replace `api.irmin.app` with your actual Irmin API domain per environment)
6. Click **Create**

7. Copy the **Client ID** and **Client Secret** shown in the popup.

#### Step 5 — Store Credentials in Irmin

Set the credentials in Core's environment and run the seed flag — this
upserts a global (workspace-wide) `connection_oauth_clients` row for
Google Drive. The flag is idempotent and safe to re-run on every deploy.

```bash
# In Core's .env (or your deployment's secret manager):
GOOGLE_DRIVE_CLIENT_ID=<YOUR_CLIENT_ID>
GOOGLE_DRIVE_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
CONNECTOR_OAUTH_REDIRECT_URI=https://<your-irmin-domain>/api/v1/connectors/oauth/callback

# Then from the Core repo root:
go run main.go -seed-oauth-clients
```

The seeder looks up the Google Drive connector by name, encrypts the
client secret with the active keyring entry, and stores
`token_endpoint_auth_method=client_secret_basic` on the row. Re-running
with rotated credentials updates the existing row in place — no manual
SQL needed.

See [`irmin/handbook/connector-architecture.md`](../../../irmin/handbook/connector-architecture.md)
("Seeding global OAuth clients") for the full env-var convention and how
to register additional static-client connectors with the same flag.

> 🔒 **Client Secret Security**: The secret is encrypted at rest using Core's AES-256-GCM keyring. It's never exposed in API responses. See `irmin/handbook/connector-architecture.md` for details.

## Scopes

The connector supports three Google Drive OAuth scopes:

| Scope | URL | Use Case |
|---|---|---|
| **Read only** | `.../auth/drive.readonly` | Import workflows — pull file metadata and contents |
| **App-specific** | `.../auth/drive.file` | Import + push to files created by Irmin |
| **Full access** | `.../auth/drive` | Import + push to any file the user can access |

The scope is configured per-Connection via the `scope` settings field. Changing the scope on an existing connection forces the user to re-authorise.

## Capabilities

| Operation | Supported | What it does |
|---|---|---|
| **Pull** | ✅ | Lists files and returns metadata as JSON + file contents as byte blobs |
| **Push** | ✅ | Upload files to Google Drive — creates new Drive files from ZIP contents, with optional folder path resolution |
| **Patch** | ❌ Not planned | |

### Pull

The pull operation fetches file metadata from Google Drive using the v3 API. Results are returned as ZIP containing:

- `files.json` — Array of file metadata objects (id, name, mimeType, size, timestamps, owner, permissions, etc.)
- (Planned) Individual file content blobs for binary files
- (Planned) Google-native documents exported to Office-compatible formats

The `max_records_per_resource` setting caps the total number of files pulled (default: 100,000).

### Push

The push operation uploads files from an incoming ZIP to the connected user's Google Drive as new files. Each file in the ZIP is uploaded individually using the Drive v3 multipart upload API.

- **Folder path**: The optional `path` parameter is treated as a Drive folder hierarchy (e.g., `/Irmin/backup`). Missing folders are created automatically. If omitted, files land in the user's root Drive.
- **MIME detection**: File content types are inferred from the extension of each upload (JSON, CSV, XML, text, images, PDF, ZIP, etc.). Unknown extensions default to `application/octet-stream`.
- **Per-file MIME type**: Drive stores each file with the detected MIME type, so content-type headers work correctly on subsequent downloads.
- **Scope requirement**: Push requires the connected user to have authorised at least the `drive.file` scope (creates app-owned files) or `drive` scope (creates files anywhere in the user's Drive).
- **Progress**: Each file creation is logged as a progress event so operators can track push through the operation logs.

## OAuth token handling

- **Tokens never leave Core.** The connector asks Core for a fresh bearer token on every vendor API request.
- **Refresh is transparent.** If a token expires, the round-tripper force-refreshes through Core and retries the request once.
- **Google test mode** issues refresh tokens that expire after **7 days**. Published apps get indefinite refresh tokens.
- **Revocation** on disconnect POSTs to Google's revocation endpoint.

## DCR vs Non-DCR

This connector uses the **static-client** OAuth pattern because Google does not support RFC 7591 Dynamic Client Registration.

| Pattern | How it works | Example vendors |
|---|---|---|
| **DCR** | Connector declares `dcr_endpoint`. Core registers a per-workspace client on first use. Zero admin setup. | Linear, Intercom, Sentry |
| **Static client** | Connector declares OAuth config without `dcr_endpoint`. Admin registers one app per environment. | Google Drive, Stripe Connect |
| **API key** | No OAuth at all. Static credentials entered per Connection. | Stripe (restricted keys) |

See the [OAuth Connectors guide](../guides/oauth-connectors.md) for a detailed comparison and decision matrix.
