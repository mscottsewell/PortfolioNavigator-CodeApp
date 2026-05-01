# PortfolioNavigator-CodeApp

PortfolioNavigator-CodeApp is a standalone Power Apps Code App version of Portfolio Navigator. It reuses the React + TypeScript UI and Dataverse-backed domain model from `PortfolioNavigator-MAT`, but replaces the web resource / `window.parent.Xrm.WebApi` hosting pattern with the `@microsoft/power-apps` SDK and Code App tooling.

## What this repo is

- A separate GitHub repository from `PortfolioNavigator-MAT`
- A Power Apps Code App for the same Portfolio Navigator experience
- Front-end only: React, TypeScript, Dataverse
- Configured for local Code App development with Vite

## Prerequisites

- Node.js 20+
- npm 10+
- Power Platform CLI (`pac`)
- GitHub CLI (`gh`) if you want to create/push the GitHub repo from the command line
- Access to the target Dataverse environment
- Power Apps Premium license
- Code Apps enabled in the target environment

## One-time setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Initialize the local Power Apps project:

   ```powershell
   npx power-apps init
   ```

   This populates local Code App configuration, including `power.config.json`.

3. Add Dataverse data sources with PAC CLI (use `-a dataverse` — the short alias for the Dataverse connector):

   ```powershell
   pac code add-data-source -a dataverse -t cai_allocation
   pac code add-data-source -a dataverse -t cai_allocationperiod
   pac code add-data-source -a dataverse -t cai_area
   pac code add-data-source -a dataverse -t cai_assignment
   pac code add-data-source -a dataverse -t cai_resource
   pac code add-data-source -a dataverse -t cai_serviceorinitiative
   pac code add-data-source -a dataverse -t systemuser
   pac code add-data-source -a dataverse -t cai_managersummary
   pac code add-data-source -a dataverse -t cai_serviceinitiativesummary
   ```

4. Re-run initialization if required by the tooling:

   ```powershell
   npx power-apps init
   ```

## Daily development

- Start the dev server:

  ```powershell
  npm run dev
  ```

- Run tests:

  ```powershell
  npm test
  ```

- Type-check:

  ```powershell
  npx tsc --noEmit
  ```

- Build:

  ```powershell
  npm run build
  ```

- Push to Power Apps:

  ```powershell
  npm run push
  ```

## Architecture notes

### Key differences from the web resource version

| Area | Web resource (`PortfolioNavigator-MAT`) | Code App (`PortfolioNavigator-CodeApp`) |
|---|---|---|
| Host | Model-driven app iframe | Power Apps Code App host |
| Dataverse access | `window.parent.Xrm.WebApi` | `getClient(dataSourcesInfo)` from `@microsoft/power-apps/data` |
| Identity | Xrm global context | Code App identity helpers + WhoAmI fallback |
| Vite plugin | `vite-plugin-singlefile` | `@microsoft/power-apps-vite/plugin` |
| Deep links | MDA `?data=` + iframe handling | Plain browser URL / hash handling |
| Deployment | Single inlined HTML web resource | Code App push flow |

### Source layout

```text
src/
  api/          Dataverse SDK wrapper and app-specific API modules
  assets/       Static assets copied from the web resource version
  components/   React UI
  contexts/     Shared React contexts
  hooks/        Feature hooks
  test/         Vitest setup and tests
  types/        Dataverse entity shapes and constants
  utils/        Pure utilities
```

### Important generated file

`.power/schemas/appschemas/dataSourcesInfo.ts` is committed here as a stub so the project type-checks before PAC generation. Replace it with the real generated file after running `pac code add-data-source`.

## Notes

- `power.config.json` is intentionally gitignored because it is environment-specific.
- Mock data fallback remains available for local development/training scenarios.
- `src/App.tsx` is a thin root export; the main app shell remains in `src/components/App/App.tsx`.
