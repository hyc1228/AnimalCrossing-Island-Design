# scripts/

One-off data pipelines that produce files committed under `src/data/`.

## `parse-nookipedia-furniture.mjs`

Parses Nookipedia's [List of all furniture in New Horizons](https://nookipedia.com/wiki/Furniture/New_Horizons/All_furniture)
HTML dump into `src/data/nh-furniture.json` (~2,075 entries).

### Refresh the data

```powershell
# 1. Re-download the wiki page (5–6 MB)
curl.exe -s "https://nookipedia.com/wiki/Furniture/New_Horizons/All_furniture" `
  -o nookipedia_all_furniture.html

# 2. Re-parse into JSON
node scripts/parse-nookipedia-furniture.mjs
```

The script reads `nookipedia_all_furniture.html` from the repo root by default
and writes to `src/data/nh-furniture.json`. Override with `--in` / `--out`.

### JSON entry shape

See `src/data/nh-furniture.ts` for the TypeScript type. Each entry has the
item name, image URL, buy/sell price, source ("Nook Shopping" / "Crafting" /
villager name / …), HHA themes, interact flag, customizable flag, and tile
footprint.

Tile footprint statistics from the latest run:

| Size      | Count |
| --------- | ----: |
| 1×1       | 1,441 |
| 2×1       |   356 |
| 2×2       |   129 |
| 3×1       |    22 |
| 1.5×1.5   |    21 |
| 1×1.5     |    21 |
| 3×3       |    20 |
| …         |     … |

These footprints map cleanly onto the planner's grid (1 cell == 1 tile).
