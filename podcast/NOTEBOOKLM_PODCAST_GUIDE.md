# Guide: 8 lydoverblik (podcasts) til finansøkonomuddannelsen

## Forberedelse (done)
- Tekst er udtrukket fra kapitel1.html–kapitel8.html til `kapitel1_tekst.txt`–`kapitel8_tekst.txt` i denne mappe.

## Trin 1: Godkend NotebookLM
Åbn en terminal og kør:
```bash
notebooklm-mcp-auth
```
Følg evt. browser-login. Når du er logget ind, er MCP klar.

## Trin 2: Opret 8 notebooks og tilføj kilde
I Cursor kan du bede AI’en om at:
1. Oprette 8 notebooks i NotebookLM (én per kapitel).
2. Tilføje indholdet fra hver `kapitelX_tekst.txt` som kilde i den tilhørende notebook.
3. For hver notebook: generere **Audio overview** med:
   - **Focus prompt:** "Lydoverblik til studerende på finansøkonomuddannelsen. Gør det let at forstå og gennemgå kapitlet."
   - **Sprog:** prøv "da" (dansk); hvis ikke understøttet, brug "en".
   - **Format:** deep_dive eller brief efter behag.
4. Når generering er færdig (poll `studio_status`), hente lyd-URL fra NotebookLM og downloade de 8 filer til mappen `podcast/`.

## Kapiteltitler til notebooks
| Nr | Titel |
|----|--------|
| 1 | Introduktion til makroøkonomi |
| 2 | Nationalregnskabet |
| 3 | Konjunkturbeskrivelse |
| 4 | Penge og finansielle markeder |
| 5 | Rentedannelse |
| 6 | Varemarkedet på kort sigt |
| 7 | Arbejdsmarked og inflation |
| 8 | Økonomisk politik og konkurrenceevne |

## Filnavne til brug på siden
Efter download skal de 8 lydfiler ligge i mappen `podcast/` med navnene:
- `kapitel1.m4a`, `kapitel2.m4a`, … `kapitel8.m4a`

Så vises de i podcast-afspilleren lige efter overskriften i hvert kapitel (kapitel1.html–kapitel8.html).

## Status: Grundige lydoverblik (min. 13 min, samme korte indledning)
Ønsket stil:
- **Indledning:** Værterne siger KUN: "Dette er en kort opsamling af kapitel X i onlinebogen, der handler om [emne]." Derefter direkte til emnet – ingen snak om målgruppe eller om teksten.
- **Indhold:** Grundig gennemgang, minimum 13 minutter. Det må gerne inkludere historiske begivenheder og eksempler.
- **Format i NotebookLM:** deep_dive, length: long.

Kapitel 1–4 er startet med disse indstillinger. Kapitel 5–8 gav "Failed to create audio overview" (sandsynligvis fordi der allerede kører/ligger et lydoverblik i de notebooks). Når de tidligere er færdige eller slettet, kan du i hver notebook (5–8) manuelt oprette nyt Audio overview med samme focus prompt, eller bede Cursor om at prøve igen.

**Focus prompt til brug i NotebookLM (erstat X og emne):**  
"Værterne skal KUN starte med: \"Dette er en kort opsamling af kapitel X i onlinebogen, der handler om [emne].\" Derefter direkte til emnet. Ingen snak om målgruppe eller om teksten. Gør det en GRUNDIG gennemgang – minimum 13 minutter. Det må gerne inkludere historiske begivenheder og eksempler."  
(Format: deep_dive, length: long, sprog: da.)

### VIGTIGT: Download skal ske i browseren
NotebookLMs lyd-URLs kræver login. Du **skal** hente MP3’erne mens du er logget ind i Google:

1. Åbn hver notebook-link nedenfor i din browser (log ind i Google hvis nødvendigt).
2. Gå til **Studio** → **Audio overview** → **Download**.
3. Gem filen i mappen `podcast/` med navnet `kapitel1.m4a`, `kapitel2.m4a`, … `kapitel8.m4a`.

Når de rigtige MP3-filer ligger i `podcast/`, og du åbner siden via **http://localhost:8000** (se nedenfor), virker lyden i afspilleren.

### Lokal server (så lyden virker)
Åbn siden via en lokal server, ikke som fil. Du kan bede Cursor/AI om at starte serveren, eller køre i terminalen:
```bash
./start-server.sh
```
Åbn derefter **http://localhost:8000/kapitel1.html** (og tilsvarende for andre kapitler).

### Direkte links til de 8 notebooks
| Kapitel | NotebookLM-link |
|--------|------------------|
| 1 | https://notebooklm.google.com/notebook/61fbcdca-dde4-4705-9e38-8e320405cbee |
| 2 | https://notebooklm.google.com/notebook/1c4966f8-6861-40d6-80c1-7e24cc15a9e0 |
| 3 | https://notebooklm.google.com/notebook/27345a1b-3713-43d8-98e9-8c8976abcfda |
| 4 | https://notebooklm.google.com/notebook/4d07f2e8-2210-4fa2-87df-24700867191f |
| 5 | https://notebooklm.google.com/notebook/be5c3d38-0f04-4bd1-8fc5-ee8c554212e9 |
| 6 | https://notebooklm.google.com/notebook/8780abf7-43c4-4e7f-8b8d-0e3211c5f525 |
| 7 | https://notebooklm.google.com/notebook/d4b4f3fb-210b-4867-9df7-a9a3ac3e0cd2 |
| 8 | https://notebooklm.google.com/notebook/fc311932-9ad4-4bde-9c2d-290c911156a9 |

## Bemærkning
NotebookLM understøtter muligvis kun sprogkoder som en, es, fr, de, ja. Hvis "da" ikke virker, brug "en" og angiv i focus prompt, at indholdet er på dansk og lydoverblikket skal være til danske finansøkonomstuderende.
