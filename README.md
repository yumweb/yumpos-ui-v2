# yumpos-ui-v2

YumPOS V2 front-end rebuild (V3 "Bento"). Vite + React + TS + Tailwind.
Tenant-aware by design (Studio11 today; Isa Spa later = a config, not a fork).

## Dev
```bash
npm install
cp .env.example .env   # set VITE_API_URL / VITE_API_KEY
npm run dev            # http://localhost:5180
```

Design tokens: `src/design/tokens.css` (light + dark). Tenant config: `src/design/tenants.ts`.
Spec / wireframes: `../claude-documentation/wireframes/v3/`.
Build guide: `../claude-documentation/v3-frontend-dev-kickoff.md`.
