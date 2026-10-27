# Nationwide campus directory

The initial database contains **5,877 institution records** from NCES IPEDS **HD2025**, downloaded October 27, 2026. It covers all 50 states, D.C., and five U.S. territories. This is a reporting-institution directory, not an inventory of every physical campus. Some branches are separate records; others and nonreporting schools may be absent. Online institutions may also appear. Confirm visit availability with the institution.

- `campuses.sqlite`: SQLite database with a unique federal UNITID, indexed state/name fields, and a provenance table.
- `provenance.json`: source URL, year, download date, ZIP SHA-256, filters and counts.
- `../web/directory-data.js`: generated offline mobile/browser snapshot of the same rows.
- `raw/`: ignored source downloads. No institution officials' names or phone numbers are exported.

Import with Python 3 (standard library only):

```sh
python scripts/import-directory.py --download
npm test
npm run build
```

Without `--download`, the import uses `data/raw/HD2025.zip`. The importer checks minimum record count, unique UNITIDs, pilot mappings and SQLite integrity before replacing outputs. It uses explicit filters: `ACT in A,N,R`, `CYACTIVE=1`, `POSTSEC=1`, `OPENPUBL=1`, and the supported state/territory codes. The original ZIP is hashed. Source year stays pinned so an update is a deliberate reviewed change.

Institution fields include name, reported aliases, address, city/state/ZIP, reported website/admissions/accessibility links, sector level/control and coordinates. Links are normalized to HTTPS and must be syntactically valid; they are not individually live-verified. Coordinates are directory coordinates, not pedestrian entrances or routes.

Coverage has two levels: `curated` for the three manually sourced pilot guides; `self-guided` for general reflection activities and personal notes. Importing a record does not manufacture building descriptions, current hours, accessibility routes or campus-specific answers.

Next data layer: verified campus buildings and visit pages keyed by UNITID, with page-level provenance, review dates and expiry/recheck rules. Map multiple physical locations separately from the institution. Only promote content to a sourced guide after review.

Source: https://nces.ed.gov/ipeds/complete-data-files/HD2025.zip
