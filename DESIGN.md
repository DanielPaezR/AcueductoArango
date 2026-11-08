# Design — JAC Arango

World: **Fachadas de Concepción.** The app is the vereda's house front: a whitewashed working
surface where painted woodwork carries meaning. Surface mode: Operate (field work on low-end phones,
in sunlight, older users, low digital literacy). Tokens live in `src/app/globals.css` (`@theme`).

## Color (provisional until the official Concepción colors are confirmed)
| Role | Token | Use |
|---|---|---|
| Cal (whitewash) | `stone-50` `#f6f7f4` | Page ground. Neutrals are green-tinted (stone scale overridden). |
| Balcón (green) | `marca-700/800` `#1f5a3a` `#184a30` | App shell (top bar, rail), primary buttons, brand. |
| Postigo (blue) | `postigo-600/700` | Water / acueducto: chips, map markers, zócalo. |
| Teja (red) | `teja-600/700` | Alerts, destructive actions, missing data authorization. |
| Ocre | `ocre-500/800` | Pending sync, incomplete data, rented-house notes. |
| Tinta | `stone-900` | Text. Secondary text `stone-600` (≥ 7:1 on white). |

## Signature: the zócalo
A 6px painted band on the bottom edge of a record (`zocalo` + `zocalo-agua|pendiente|alerta|muro`,
drawn as an inset shadow so it follows the radius). It always encodes state; never use it as decoration.
- blue: uses the acueducto · ochre: pending upload / incomplete · red: personal data without authorization · wall: neither.

## Type
Atkinson Hyperlegible Next (self-hosted variable font, works offline), designed for low vision.
Root 17px. Page titles 1.75rem bold; section titles 1.125rem bold; body 1rem; minimum 0.875rem.
All counts, codes, IDs and coordinates use `.num` (tabular figures).

## Components
- Buttons and inputs: min height 48px (`btn-primario`, `btn-secundario`, `btn-peligro`, `input`, `label`).
- `tarjeta`: white panel, 1px line, soft offset shadow, 14px radius. Never nest panels.
- `chip`: rounded status label, tinted background from its own hue.
- Icons: lucide-react, one stroke weight. No emoji as icons.
- Mobile navigation: green top bar + bottom tab bar (Inicio, Mapa, Registrar, Viviendas, Menú).
  Desktop: green rail; modules not yet built grouped under "En construcción".
- Maps: Esri satellite by default; house marker = green house with blue base; dots: blue (water), ochre (no water).

## Voice
Plain Colombian Spanish addressed with "usted". Buttons name their action; errors say what happened and what to do.
