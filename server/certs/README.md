# Supabase public root CA

Source: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Downloaded over HTTPS on 2026-10-28. This is a public certificate, not a credential.

Subject/issuer: Supabase Root 2021 CA, Supabase Inc.
Expires: 2031-04-26.
SHA-256: `807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA`.

The API uses this CA and requires successful certificate and hostname verification. Override with `DB_SSL_CA_PATH` when the project uses a different CA.
