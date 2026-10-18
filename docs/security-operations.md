# Security operations

## Upload scanner

Set `SCANNER_URL` and `SCANNER_AUTH_TOKEN` as Cloudflare Worker secrets. The endpoint must be private, accept the uploaded bytes in a POST request, authenticate the bearer token, and return only `{"verdict":"clean"}` or `{"verdict":"rejected"}`. Quarantined objects live under `quarantine/`; configure an R2 lifecycle rule to expire them after 30 days. Only records marked `clean` are downloadable.

## Encrypted backups

The daily workflow obtains a fresh AES-256 key from AWS KMS, encrypts a compressed operational-data export, and uploads only the encrypted payload and its manifest to the private backup bucket. Session records and portal-token hashes are deliberately excluded. Grant the GitHub OIDC role only KMS data-key/decrypt rights for the designated key and R2 writes to the backup bucket. Configure bucket lifecycle rules to retain 35 daily and 12 monthly snapshots. Test restores periodically with `npm run backup:restore -- <prefix> <isolated-restore-directory>`; it verifies the digest and writes only to the isolated directory.
