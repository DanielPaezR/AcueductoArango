# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary: field work on a phone.** The JAC president (admin), survey volunteers (encuestadores) and the plumber (fontanero) visiting houses and the water network across the rural vereda Arango (Concepción, Antioquia, Colombia): outdoors, often in direct sun, with weak or no mobile signal, sometimes one-handed.
- **Secondary: office work.** Admins and the treasurer reviewing households, water subscribers, payments and reports, on a phone or a basic PC.
- **Future:** water subscribers checking their own account statement (pending, not built).
- Confirmed: users include **older adults** and people with **little digital experience**, and many use **low-end phones**.

## Product Purpose
JAC Arango is the community information system of the Junta de Acción Comunal of vereda Arango. It replaces nonexistent or scattered records with:
- a georeferenced census of every house and its members (500–700 houses);
- a record of aid and community-project participation;
- a map of the community water system (acueducto): intake, tanks, valves, pipes, and the plumber's repair log with photos and material invoices;
- billing of the flat monthly water fee: periodic charges, payments, and each subscriber's account status.

Success: every house is mapped and reachable; the JAC knows who lives where, who uses the water system and who is up to date on payments; work in the field never loses data for lack of signal.

## Positioning
Built for one specific vereda and its JAC, by and for the community: the data is the community's own map of itself and of its water system, kept by its elected board. It is not a generic municipal or commercial utility system.

## Operating Context
- House visits follow a fixed 12-question form agreed by the JAC (head of household, age, ID, phone, property name/reference, rented or owned, other members with ages, main livelihood, water service, water-right registration and number, registration holder if rented).
- GPS capture at the door; satellite map to adjust the point.
- Offline-first: records are saved on the phone and synced later; pending items are visible.
- Personal data requires the family's authorization (Colombian Ley 1581 de 2012), read aloud at the visit.
- Roles: superadmin, admin, fontanero, encuestador, tesorero, suscriptor (pending). Per-section permissions.
- Deployed on Railway (Next.js + PostgreSQL); photos in Cloudinary.

## Capabilities and Constraints
- Spanish (Colombia) only. Currency COP. Dates in America/Bogota.
- Must work well on low-end Android phones over slow connections; installable PWA.
- Built: login/roles/users, census (houses, people, sectors), users map, offline sync.
- Planned: water-network map and plumber module, billing, aid/projects, reports, subscriber portal.
- Undecided: final brand colors (user asked to reference the flag of Concepción, Antioquia; exact colors not yet confirmed).

## Brand Commitments
- Name: **JAC Arango**.
- Visual reference requested by the user: the colors of the municipality of Concepción, Antioquia (to be confirmed from the official flag before being treated as binding).
- Voice: plain, respectful Colombian Spanish; "usted"-neutral, no jargon, no English.

## Evidence on Hand
- No logo, photos, testimonials or official documents in the repo yet. Do not fabricate any.

## Product Principles
1. **Field first.** Every flow must be finishable on a cheap phone, in the sun, without signal.
2. **Never lose a record.** Saving locally comes before anything else; sync state is always honest and visible.
3. **Plain for everyone.** Large targets, short labels, one decision at a time; older and less digital users must not get lost.
4. **The community's trust.** Personal data is handled with consent, minimal exposure and an audit trail.
5. **Maps are the index.** Houses and water infrastructure are found by place first, list second.

## Accessibility & Inclusion
- Older adults: base text ≥ 16px, larger controls (≥ 44px targets), high contrast (WCAG AA minimum, prefer AAA for body text) because of outdoor sunlight.
- Low digital literacy: explicit labels over icons alone, no hidden gestures, clear confirmation of saves.
- Low-end devices: light pages, no heavy fonts or effects, minimal JS on list pages.
