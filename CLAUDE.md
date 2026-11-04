# Xala!

«Jocs de festa en català per jugar en grup»: PWA sense build (mòduls ES, HTML, CSS) amb una portada i molts jocs, cadascun al seu fitxer (`dames.js`, `escacs.js`, `connecta4.js`, `penjat.js`, `passaparaula.js`, `impostor.js`, `joc2048.js`, `memory.js`, `encaixa.js`, `bomba.js`, `endevinala.js`, `quiprobable.js`, `sopa.js`, `sudoku.js`, `vaixells.js`, `tresenratlla.js`, `aescena.js`, `mat2.js`, `traca.js`…). Parla amb l'usuari en català.

## On viu i com es publica

- **Adreça:** https://luchinrok.github.io/Xala/. Repo `Luchinrok/Xala`, GitHub Pages des de `main`.
- **Fer push a `main` és publicar.** Treballar en una branca, ensenyar el resultat i **pujar només quan l'usuari ho digui**.
- Git no té identitat configurada en aquest PC: fer els commits amb `git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit ...`.
- A casa l'usuari fa servir Android, però l'app ha de continuar funcionant a iOS.

## Com es treballa

- **Service worker (`sw.js`):** a cada canvi publicat, pujar la versió de `CACHE` (`xala-vNN`; a 04-11-2026 és `xala-v99`) i afegir a `ASSETS` els fitxers nous. Si no, els mòbils continuen amb la versió antiga.
- **Proves:** `npm test` (motor d'escacs i els 450 problemes de Mat en 2) ha de passar abans i després de cada canvi. Provar a mà els jocs que es toquen (començar una partida).
- **Traduccions:** a `i18n.js` (7 idiomes). Qualsevol text nou de la interfície hi ha d'anar.
- **Mòbil:** `touch-action: manipulation` a tota l'app (sense zoom per doble toc ni retard); els taulers d'arrossegar (Encaixa!, Sopa, Vaixells, 2048) tenen `touch-action: none`. Els camps de text, 16 px o més (perquè l'iPhone no faci zoom). No tornar a posar `maximum-scale` al viewport.
- **Marca:** corall `#E4572E` sobre crema, estil de festa major (ombres «enfonsables», fons de punts). És el caràcter de l'app: no treure'l en nom de la sobrietat. Lletres: Bricolage (títols) i Hanken Grotesk (text); els botons han d'heretar la lletra (`font: inherit`).
- **Disseny:** hi ha els skills `design-taste-frontend` (veure'n `references/app-screens.md`), `web-design-guidelines` i `awesome-design-md`. Adaptar les normes al to de joc, no aplicar-les a cegues.
- **Textos:** to proper i de festa, frases curtes, que no sembli escrit per una IA.
- **Provar:** servir la carpeta en local (`python -m http.server`) i fer captures a 390 px i a 360x640 (Android petit), p. ex. `node ~/.claude/skills/design-taste-frontend/scripts/inspect.mjs <url> --app --widths 390`.

## Historial de millores

- 03-11-2026: branca `millores-disseny` fusionada i publicada (lletra Arial corregida, taulers dins del marge, text de la portada sense retallar, zoom permès, focus de teclat, moviment reduït, `aria-pressed`, botó «Comença» a baix a tots els jocs).
- 03-11-2026 (publicat): joc «Mat en 2» a Un sol jugador. 450 problemes de Lichess (CC0) verificats amb el motor (`mat2-problemes.js` és generat), problema del dia amb ratxa, pista i solució, botó «Repta» que comparteix una imatge, i enllaç `#mat-N` que obre el problema.
- 04-11-2026 (publicat): teclat a Dames, Vaixells, Sopa i Encaixa! (`board-keys.js`: el focus és al tauler, amb un cursor), fletxa d'Enrere dibuixada amb CSS, tots els jocs amb totes les categories d'entrada i `.btn-row` sense desbordar a pantalles petites.
- 04-11-2026 (publicat): icones PNG (Android feia una «L» amb la primera lletra de l'adreça), Escacs també a Un sol jugador, Mat en 2 deixa clar que no té límit. Gest enrere refet amb el model de Buyte: cada canvi de pantalla fet amb un toc afegeix una entrada a l'historial (mai sense toc, Chrome se les salta). L'enllaç `#mat-N` amb l'app ja oberta tancava l'app o no obria el problema. Ara l'obre i el botó enrere del mòbil funciona.
- 04-11-2026 (publicat): La Traca, joc propi de paraules, inspirat en la idea de fer paraules amb lletres donades però amb nom, aspecte i regles propis (sense lletra obligatòria ni rusc). Paraules de Softcatalà (GPL/LGPL): `traca-reptes.js` és generat i porta `LLICENCIA-diccionari.txt`.
