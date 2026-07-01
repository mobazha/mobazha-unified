# Security Policy

## Supported versions

Security fixes are provided for the latest Community Edition release. Pre-release branches and older releases may receive fixes at the maintainers' discretion.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability, leaked credential, signing-key concern, payment bypass, or exploit.

Use GitHub's private vulnerability reporting for this repository:

1. Open the repository's **Security** tab.
2. Select **Advisories** and **Report a vulnerability**.
3. Include affected versions, impact, reproduction steps, and any proposed mitigation.

If private vulnerability reporting is temporarily unavailable, contact the repository owners privately through the Mobazha GitHub organization and ask for a secure reporting channel. Do not include exploit details in the initial public contact.

## Scope reminders

- Never submit production credentials, private keys, seeds, tokens, private endpoints, or customer data.
- Treat backend, wallet-provider, plugin, rich-text, URL, and webhook-derived inputs as hostile.
- The frontend must not persist signing material or expand backend-advertised payment capabilities.
- Payment amounts must use the project's arbitrary-precision utilities rather than native floating-point arithmetic.
