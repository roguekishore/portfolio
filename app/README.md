# app

The site. Setup and run instructions are in the [root README](../README.md).

```bash
npm ci
npm run dev    # http://localhost:3000
```

Routes:
- `/` — homepage
- `/work` — work index (`?filter=<category>`)
- `/projects/[slug]` — case studies, statically generated for every project

Code:
- `app/` — root layout (persistent chrome, widgets, cursor, transitions),
  routes, global styles and tokens (`globals.css`)
- `components/` — homepage sections (`Hero`, `Work`, `News`, `Contact`), fixed
  chrome (`Chrome`, `Widgets`, `Cursor`), page transitions and `TLink`
  (`Transition`), work index (`WorkIndex`), placeholder media (`Media`)
- `components/case/` — case-study page and its modules
- `lib/content.ts` — all copy and data, including case studies
