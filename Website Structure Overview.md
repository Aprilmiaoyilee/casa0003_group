## ✅ 1. Website Structure Overview

| Page                   | Target Audience                     | How                                                          | workway |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------ | ------- |
| 1️⃣ `about.html`         | Everyone                            | Explain purpose, audiences, how to use the site              |         |
| **2️⃣ `map.html`**       | General Public                      | Overview of the entire cycle network, with basic filters     |         |
| 3️⃣ `map_commuters.html` | Urban Cyclists / Workers / Students | Display: cycle paths + parking + tube stations + offices + universities |         |
| 4️⃣ `map_tourists.html`  | Tourists                            | Display: cycle paths + tourist attractions + parking + tube stations |         |
| 5️⃣ `map_planners.html`  | City Planners / TFL                 | Display: accident hotspots + gaps in network (via Python)    |         |
| 6️⃣ `conclusion.html`    | Everyone                            | Summary, recommendations, potential improvements             |         |



Below are just suggestions:

## 🧩 2. Feature Ideas per Audience Group

### 👥 Group 1: Urban Cyclists / Workers / Students

- **Toggle layers**:
  - 🛣️ Cycle network
  - 🚲 Cycle parking locations
  - 🚇 Nearby tube stations
  - 🏢 Office clusters
  - 🎓 University locations
- **Use case**: Help users find practical, safe, multimodal commuting routes

------

### 👨‍👩‍👧‍👦 Group 2: Tourists

- **Toggle layers**:
  - 🛣️ Cycle network
  - 📍 Tourist attractions
  - 🚲 Parking
  - 🚇 Tube stations
- **Use case**: Help visitors explore London by bike safely and efficiently

------

### 🏙️ Group 3: City Planners / TFL

- **Data layers**:
  - ⚠️ Accident data (color-coded by severity or density)
  - 🕳️ “Network gaps” – computed using Python (e.g., disconnected segments or islands)
- **Use case**: Identify weak points in infrastructure, justify investment



| Team Member     | Page Focus                                                 | Tasks                                                        |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| A – HTML/CSS    | `about.html`, `conclusion.html`, general layout            | Design structure, visual consistency, header/footer          |
| B – JS/Map Dev  | `map_urban.html`, `map_tourists.html`, `map_planners.html` | Load appropriate datasets and render interactive maps        |
| C – Coordinator | `map.html`, data pipeline (Python), integration            | Coordinate data wrangling, ensure maps match target users, explain flow |