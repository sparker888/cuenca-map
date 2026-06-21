# Seed vs OSM duplicate report (curation aid)

Read-only. 17 overlap(s) between published hand-seeded records (no `osmId`) and
OSM-imported records. **NAME** = normalized names match exactly. **GEO** = within 300 m with a
similar name. Resolve each by hand — usually keep the curated seed, delete the OSM draft, or merge.

Scanned 20 published no-osmId seeds against 783 osmId records.

| Match | Dist | Seed (keep?) | Seed cat `id` | OSM record | OSM cat `id` |
|---|---|---|---|---|---|
| GEO | 2 m | Parque Calderón | landmark `86kx0vm0u3ruz1d` | Parque Abdón Calderón | outdoors (pub=false) `lx2b65odto352w6` |
| GEO | 4 m | Plaza San Francisco | market `wxuwl37d5qaj08f` | Plaza de San Francisco | landmark (pub=false) `mpvhdpewqufqf8b` |
| GEO | 7 m | Museo del Sombrero (Toquilla Straw Hat) | museum `niugfanqqdjk2gi` | Museo del Sombrero de Paja Toquilla (Panama Hat Museum) | museum (pub=false) `7ks7k9jbak5bqad` |
| GEO | 22 m | Parque San Sebastián | landmark `sodfw80fk2i810i` | Parque de San Sebastián | outdoors (pub=false) `ciejnx2bpxg0nrb` |
| GEO | 82 m | Plaza San Francisco | market `wxuwl37d5qaj08f` | San Francisco | landmark (pub=false) `r5i5nh13d8dhwsq` |
| GEO | 102 m | Plaza de las Flores | landmark `e1j6cq0mkf724et` | Plaza de San Francisco | landmark (pub=false) `mpvhdpewqufqf8b` |
| GEO | 104 m | Plaza San Francisco | market `wxuwl37d5qaj08f` | Plaza de las Flores | landmark (pub=false) `4eh2fcznsb0xpoc` |
| GEO | 163 m | Parque San Sebastián | landmark `sodfw80fk2i810i` | Parque de Los Arupos | outdoors (pub=false) `a7xfqjxlu3286xq` |
| GEO | 165 m | Mercado 9 de Octubre | market `bh2no1krq6ng0x3` | Mercado de Artesanías Rotary | market (pub=false) `nuxv8emd5fwonon` |
| GEO | 166 m | Pumapungo Museum & Ruins | museum `26lu5r9pqiwhmwk` | Pumapungo Avery | landmark (pub=false) `10zk7c3q5is3izw` |
| GEO | 168 m | Pumapungo Museum & Ruins | museum `26lu5r9pqiwhmwk` | " Pumapungo"  Cafeteria Restaurant | restaurants-cafes (pub=true) `m9sn7ebl4fphiqv` |
| NAME | 1 m | Mercado 9 de Octubre | market `bh2no1krq6ng0x3` | Mercado 9 de Octubre | market (pub=false) `sg6tzmu3dp9gvck` |
| NAME | 2 m | Plaza de las Flores | landmark `e1j6cq0mkf724et` | Plaza de las Flores | landmark (pub=false) `4eh2fcznsb0xpoc` |
| NAME | 8 m | Mirador de Turi | outdoors `fz07ck355kib64k` | Mirador de Turi | landmark (pub=false) `f5qcwybfd4u05gx` |
| NAME | 12 m | Mercado 10 de Agosto | market `7m7crtf9pvrlizp` | Mercado 10 de Agosto | market (pub=false) `onneqjgm4n3z038` |
| NAME | 57 m | Parque de la Madre | outdoors `fu1f3xuzi6pwnsx` | Parque de La Madre | outdoors (pub=false) `4pbrmy30hypfa2t` |
| NAME | 187 m | Parque El Paraíso | outdoors `r36g0vnu2xzmvyg` | Parque El Paraíso | outdoors (pub=false) `ifzsizptnnjhdtq` |
