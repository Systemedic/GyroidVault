# GyroidVault To-Do List & Brainstorm

Dit document bevat ideeën en geplande functionaliteiten om GyroidVault nog krachtiger en praktischer te maken dan alternatieven zoals Manyfold, zonder dat het overzicht en de eenvoud van de applicatie verloren gaan.

---

## 🛠️ 1. Project- & Assemblagebeheer (Het 'Project' Gevoel)
*Veel 3D-bestandsbeheerders stoppen bij het downloaden van de bestanden. GyroidVault kan de brug slaan naar de daadwerkelijke creatie.*

- [ ] **Visueel Assemblagebord (Kanban-stijl)**
  - Deel een project (Collectie) op in kolommen/statusfases: *Nog te printen*, *Bezig met printen*, *Geprint*, en *Gemonteerd*.
  - Ideaal voor complexe projecten die uit tientallen losse STL-onderdelen bestaan.
- [ ] **BOM (Bill of Materials) & Hardware Checklist**
  - Voeg een lijst toe van benodigde niet-geprinte hardware per project (bijv. *"12x M3 10mm boutjes"*, *"4x 608 lagers"*, *"6x2mm magneten"*).
  - Vink af wat je al in huis hebt of al hebt gemonteerd.
- [ ] **Stap-voor-stap Montagehandleiding**
  - Mogelijkheid om foto's, links en Markdown-instructies toe te voegen aan een collectie, zodat je in GyroidVault direct kunt zien hoe je het project in elkaar zet.

---

## 🧵 2. Filament- & Voorraadbeheer (Fysieke Integratie)
*Koppel je digitale modellen en printlogs direct aan je fysieke voorraad filament.*

- [ ] **Visueel Filament Rek (Filament Rack)**
  - Een prachtig vormgegeven dashboard dat je fysieke rollen filament toont als realistische rollen met hun echte kleur (hex-code), merk, materiaal (PLA, PETG, TPU) en resterend gewicht.
  - Optionele integratie met de populaire **Spoolman** API, of een eenvoudige, snelle ingebouwde database.
- [ ] **Automatische Verbruiksregistratie**
  - Selecteer bij het loggen van een print de gebruikte rol filament. GyroidVault trekt automatisch het aantal verbruikte grammen (berekend uit de G-code of handmatig ingevoerd) af van het resterende gewicht van de rol.

---

## 🌐 3. Slimme Integraties & Automatische Metadata
*Bespaar tijd bij het importeren en taggen van nieuwe modellen door handmatig werk te automatiseren.*

- [ ] **1-Klik Printables / Thingiverse Metadata Importer**
  - Plak de URL van een Printables- of Thingiverse-pagina en GyroidVault haalt automatisch de titel, beschrijving, licentie, tags en de originele coverfoto's op.
- [ ] **Automatische Scanner Regels (Smart Folder Rules)**
  - Stel slimme regels in voor de automatische folder watcher. Bijvoorbeeld: *"Als de mapnaam 'TPU' bevat, voeg dan automatisch de tag 'TPU' toe en markeer als flexibel."*
  - Genereer automatisch collecties gebaseerd op de mappenstructuur op de schijf.

---

## 👁️ 4. Geavanceerde 3D & Slicer Previews
*Krijg een beter beeld van de schaal en details van een model voordat je je slicer opent.*

- [ ] **Referentie-objecten in de 3D Viewer (Scale Reference)**
  - Voeg een dropdown toe aan de 3D-viewer om een bekend alledaags object (zoals een AA-batterij, een blikje cola, een smartphone of een 3D-banaan) direct naast het model te renderen. Dit geeft direct een gevoel van de ware grootte.
- [ ] **2D Bouwplaat Planner (Print Plate Canvas)**
  - Een minimalistisch 2D-canvas dat je printerbed representeert (bijv. 256x256mm voor Bambu Lab). Sleep thumbnails van STL's op de plaat om te kijken of ze samen in één printrun passen, en sla dit op als een geplande "Print Job".

---

## 📊 5. Dashboard & Printer Monitoring
*Maak van GyroidVault het centrale zenuwcentrum van je 3D-print-setup.*

- [ ] **Live Printer Monitor Card**
  - Toon de live webcam-stream (MJPEG/WebRTC), temperatuurgrafiek en voortgangsbalk van actieve Klipper (Moonraker) of Bambu Lab printers direct op het GyroidVault-dashboard.
- [ ] **Printstatistieken & Kostenanalyse**
  - Interactieve grafieken (bijvoorbeeld met Chart.js) die laten zien hoeveel gram filament je per maand verbruikt, het succespercentage van je prints, en een schatting van de totale stroom- en materiaalkosten.
