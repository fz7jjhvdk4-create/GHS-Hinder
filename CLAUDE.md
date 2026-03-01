# GHS Hinderinventering

Webbapplikation for inventering och hantering av hinder, bommar och plankor for Gothenburg Horse Show 2026.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4
- **Backend:** Next.js API Routes (serverless)
- **Database:** PostgreSQL via Neon.tech (serverless) + Prisma 7 ORM (`@prisma/adapter-neon`)
- **Hosting:** Vercel
- **Offline:** Service Worker + IndexedDB (idb-keyval) + PWA manifest
- **Auth:** Cookie-baserad PIN-auth (httpOnly, 30-dagars session)

## Project Structure

```
ghs-hinder-app/
  src/
    app/
      page.tsx              # Main page (3 tabs: Hinder, PP, Publicera)
      layout.tsx            # Root layout + ServiceWorkerRegistrar
      login/page.tsx        # PIN login page
      view/
        page.tsx              # Public read-only inventory view (no auth required)
        PrintButton.tsx       # Client component for print button
      api/
        auth/               # login + logout
        fences/             # GET/POST + [id] PATCH/DELETE (incl. name rename)
        components/         # Fence components CRUD
        images/             # Fence images CRUD + reorder
        pp/                 # Poles & Planks CRUD (incl. name rename)
        sections/           # Sections CRUD + reorder
        export/             # Standalone HTML export (public, no auth)
        admin/reset/        # POST: reset all checked marks (auth required)
        health/             # Health check for connectivity
    components/
      FenceList.tsx         # Fence inventory list (main)
      FenceCard.tsx         # Individual fence card
      PPList.tsx            # Poles & Planks list
      PPCard.tsx            # Individual PP card
      ColorPatternEditor.tsx # Tri-mode: SVG stripes + photo upload + advanced plank editor
      ColorPatternSVG.tsx   # SVG dispatcher (simple stripes or advanced)
      AdvancedPatternSVG.tsx # SVG renderer for advanced plank patterns
      AdvancedPatternEditorPanel.tsx # Advanced plank editor (height, bg, ends, diagonals, text, logo)
      ImageGallery.tsx      # Full-screen image gallery
      SectionHeader.tsx     # Collapsible section headers
      ConnectionStatus.tsx  # Online/offline/syncing banner
      ServiceWorkerRegistrar.tsx
      PublishTab.tsx         # Stats overview + public link + HTML export
      LogoutButton.tsx
    lib/
      db.ts                 # Prisma client (Neon adapter)
      auth.ts               # PIN validation, session management
      advancedPattern.ts    # Types, type guard, height resolver for advanced patterns
      advancedPatternSvg.ts # Shared SVG geometry computation (client, server, export)
      imageUtils.ts         # Shared image compression
      offlineStore.ts       # IndexedDB: API cache + mutation queue
      syncManager.ts        # cachedFetch + mutationFetch + replayQueue
      useOnlineStatus.ts    # React hook for online/offline detection
  prisma/
    schema.prisma           # Database schema
    prisma.config.ts        # Prisma config with Neon adapter
  public/
    sw.js                   # Service Worker v2 (network-first pages, cache-first assets)
    manifest.json           # PWA manifest
    ghs-logo.jpg            # Logo
```

## Database

- **Host:** Neon.tech (eu-central-1)
- **Connection:** `DATABASE_URL` in `.env` (pooler endpoint with `?sslmode=require`)
- **Prisma config:** Uses `prisma.config.ts` (not `prisma/schema.prisma` for config) with `@prisma/adapter-neon`

### Models

- **Section** — organizational groups (type: "fence" | "pp")
- **Fence** — obstacles with images and components
- **FenceImage** — photos (base64 in `imageUrl`), cascade delete
- **FenceComponent** — Wings/Poles/Fillers (type, count, description, bomId)
- **PoleOrPlank** — poles/planks/gates with `colorPattern` (JSON), `colorImage` (base64 Text), `height` (0=auto, 1=smal, 2=normal, 3=bred)

## Auth

- PIN codes: `ghs2026`, `ghs`, `ghs2026arena`
- Session: httpOnly cookie `ghs_session`, base64 JSON, 30-day expiry
- Middleware checks all routes except `/login`, `/api/auth/*`, `/view`, `/api/export`, `/_next/*`, static files
- Public routes (no auth): `/view` (read-only inventory), `/api/export` (HTML download)

## Key Patterns

### Optimistic Updates
All mutations use optimistic UI updates:
1. Update local state immediately
2. Call `mutationFetch()` (queues offline, returns synthetic 202)
3. No rollback needed — offline mutations are queued and replayed

### Inline Rename
- Fence names and PP names are editable inline (tap to edit)
- Enter to save, Escape to cancel, blur to commit
- PATCH `/api/fences/[id]` and `/api/pp/[id]` both accept `name` field

### Offline Support
- `cachedFetch(url)` — network-first, falls back to IndexedDB cache
- `mutationFetch(url, opts)` — tries fetch, queues in IndexedDB on network error
- `replayQueue()` — replays queued mutations on reconnect (chronological order)
- `ConnectionStatus` banner — red (offline), gold (syncing), green (online)
- Service Worker (v2): **network-first for pages** (always fresh after deploy), **cache-first for static assets** (`/_next/` with content hashes)
- API responses NOT cached by SW — handled by syncManager + IndexedDB

### Public View
- `/view` — server-rendered read-only page, no auth required
- Shows full inventory (fences + PP) with images, components, stats
- Print button for physical copies
- PublishTab provides copy-link UI + "open in new tab" link

### Color Patterns (PP)
- Tri-mode editor: "Rander" (SVG stripes) + "Foto" (photo upload) + "Avancerad" (planks/gates only)
- SVG uses cumulative percentage rounding for pixel-perfect segments
- Draggable segment resizer with touch+mouse support
- Up to 30 segments, MIN_SEGMENT_PERCENT = 2%
- SVG heights: pole=8px, plank=12px, gate=24px, rx=1 (straight ends)

### Advanced Plank Patterns (US-011)
- Discriminated union in `colorPattern` JSON: `Array` = simple stripes, `{mode:"advanced",...}` = advanced
- `isAdvancedPattern()` type guard detects format
- Features: background color, end colors (rect or diagonal), diagonal stripes (pattern+rotate), text overlay, logo (base64, optional overflow)
- Logo overflow: logo extends above/below plank (SVG viewBox expands, logo rendered outside clipPath)
- Diagonal ends: triangular polygon ends instead of rectangular (endStyle: "rect" | "diagonal")
- Height field: 0=auto, 1=smal(8px), 2=normal(12px), 3=bred(24px)
- Shared geometry: `computeAdvancedSvgGeometry()` used by client, server (/view), and HTML export
- SvgGeometry includes `plankY`/`plankHeight` offsets for logo overflow expansion
- "Avancerad" tab hidden for poles (only shown for plank/gate types)
- Editor sections: collapsible panels with live SVG preview

## Design System

- **GHS Colors:** #0a1628 (dark navy), #1a3a6e (navy), #2F5496 (blue), #27ae60 (green), #b8860b (gold), #e74c3c (red)
- **Language:** Swedish (sv) throughout UI
- **Mobile-first:** Designed for iPad/iPhone use in horse show barns
- **Font:** System fonts via Tailwind

## Development

```bash
# Dev server
npm run dev

# Build
npm run build

# Database
npx prisma migrate dev    # Run migrations
npx prisma generate       # Generate client
```

## Deployment

- Push to `main` branch triggers Vercel auto-deploy
- Production: https://ghs-hinder-app.vercel.app
- GitHub: https://github.com/fz7jjhvdk4-create/GHS-Hinder

### Inventory Reset
- `POST /api/admin/reset` — resets all `checked` to `false` on fences and poles/planks
- Only resets check marks — preserves colors, images, notes, sections, everything else
- Accessible via "Nollstall inventering" button in Publicera tab
- Uses `window.confirm()` before executing (destructive action)
- Intended for starting a new inventory year

## Lessons Learned

1. **Tailwind CSS 4 JIT + arbitrary values in server components**: Arbitrary classes like `w-[160px]` may not generate CSS correctly in server components — the JIT compiler can miss them. **Fix:** Use inline `style={{ width: 160 }}` for server components when arbitrary values fail.

2. **`object-contain` vs `object-cover` for inventory photos**: Use `object-contain` (not `object-cover`) to show full obstacle images without cropping. Add a neutral background color (`bg-[#f0f2f5]`) behind the image.

3. **Shared SVG geometry pattern**: The `computeAdvancedSvgGeometry()` function is used by 4 different renderers (client component, editor preview, server page, HTML export string). All SVG rendering changes must be applied to all 4 places. Keep geometry computation in a single shared file.

4. **SVG logo overflow architecture**: To render a logo that extends beyond the plank boundaries, expand the SVG viewBox height and offset the plank downward (`plankY`). Render the logo OUTSIDE the `<g clipPath>` group so it's not clipped, while keeping background/stripes/ends inside the clip.

## User Stories (all complete)

| US | Title | Status |
|----|-------|--------|
| US-001 | Databasschema och projektsetup | ✅ |
| US-002 | PIN-autentisering | ✅ |
| US-003 | Hinderlista med avbockning och anteckningar | ✅ |
| US-004 | Komponenter per hinder | ✅ |
| US-005 | Flera bilder per hinder | ✅ |
| US-006 | Redigerbara rubriker och sektioner | ✅ |
| US-007 | Poles & Planks-lista | ✅ |
| US-008 | Skapa och ta bort hinder | ✅ |
| US-009 | Publik export (skrivskoddad HTML) | ✅ |
| US-010 | Realtidssynk och offline-stod | ✅ |
| US-011 | Avancerad SVG-generator for plankor | ✅ |
