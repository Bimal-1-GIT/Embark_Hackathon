# AI REGO — Nepal Edition

**AI-Powered Smart Grid Demand Forecasting & Load Intelligence for Nepal**

Built for the hackathon theme: *"AI in Global Energy Transition"*

---

## What is AI REGO?

AI REGO is a real-time grid intelligence dashboard tailored for **Nepal Electricity Authority (NEA)**. It helps grid operators:

- **Forecast** electricity demand per region for the next 72 hours
- **Predict** hydropower output based on seasonal river flow models
- **Flag** dry-season deficit windows and recommend India import triggers
- **Recommend** load balancing and demand-side management actions
- **Answer** "what-if" scenario questions via AI chat (in English and Nepali)

---

## Nepal Grid Context

Nepal's electricity grid is unique:
- **93% hydropower** — highly seasonal (monsoon surplus vs dry season deficit)
- **8 load dispatch zones** covering Kathmandu Valley, Terai industrial belt, and hill regions
- **Cross-border trade** with India via Dhalkebar–Muzaffarpur 400kV link
- **Load shedding** risk during Dec–May dry season
- **Festival surges** during Dashain/Tihar add +20% residential demand

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Nepal    │ │ Forecast │ │ Alert    │ │ What-If    │ │
│  │ Grid Map │ │ Chart    │ │ Feed     │ │ AI Chat    │ │
│  │(Leaflet) │ │(Recharts)│ │(Bilingual│ │(EN + NP)   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘ │
│       └─────────────┴────────────┴─────────────┘        │
│                         │ Axios                          │
│                    Vite Dev Proxy                         │
└────────────────────────┬────────────────────────────────┘
                         │ /api/*
┌────────────────────────┴────────────────────────────────┐
│                   BACKEND (FastAPI)                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Routes: /api/grid  /api/forecast  /api/ai        │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│  ┌──────────────┐  ┌────┴───────────┐                   │
│  │ Nepal Hydro  │  │ LLM Service    │                   │
│  │ Simulator    │  │ (Azure OpenAI) │                   │
│  │ - Seasonal   │  │ - Recommender  │                   │
│  │ - Cross-     │  │ - What-If Chat │                   │
│  │   border     │  │ - Bilingual    │                   │
│  └──────────────┘  └────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + Tailwind CSS + Recharts  |
| Map        | Leaflet.js + react-leaflet          |
| Backend    | Python FastAPI                      |
| AI/LLM     | Azure OpenAI GPT-4o                 |
| Data       | Synthetic data modeled on NEA grid  |
| Time       | Nepal Standard Time (UTC+5:45)      |

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- npm or yarn

### Backend

```bash
cd ai-rego-nepal/backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`

### Frontend

```bash
cd ai-rego-nepal/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` (proxies API calls to backend)

---

## Features

### 1. Live Nepal Grid Map
- Leaflet.js map centered on Nepal with 8 zone polygons
- Color-coded load status (Green/Yellow/Red/Blue)
- Click any zone for detailed popup with load, capacity, hydro %, import status

### 2. 72-Hour Forecast Panel
- Demand vs Hydro Supply vs Import Cushion line chart
- Visual deficit/surplus indicators

### 3. NEA Stress Alert System
- Bilingual alerts (English + Nepali/Devanagari)
- Dry season deficit alerts, India import triggers, festival surge warnings

### 4. AI Recommendation Cards
- 3 auto-generated grid optimization recommendations
- MW relief, CO2 savings, and estimated NPR savings per recommendation

### 5. What-If AI Chat (Bilingual)
- Ask scenarios in English or Nepali
- References real Nepal grid assets (Kulekhani, Upper Tamakoshi, Dhalkebar link)

### Bonus Features
- **Monsoon / Dry Season toggle** — see how Nepal's grid changes dramatically
- **Dashain/Tihar festival mode** — simulates +22% residential demand surge
- **Cross-border trade ticker** — live MW import/export with India
- **Kulekhani reservoir gauge** — storage level indicator
- **Load shedding predictor** — probability per zone in next 6 hours

---

## Nepal Grid Zones

| # | Zone                              | Nepali                     | Capacity |
|---|-----------------------------------|----------------------------|----------|
| 1 | Kathmandu Valley                  | काठमाडौं उपत्यका            | 480 MW   |
| 2 | Pokhara & Gandaki                 | पोखरा र गण्डकी              | 210 MW   |
| 3 | Eastern Terai (Biratnagar)        | पूर्वी तराई                  | 310 MW   |
| 4 | Central Terai (Birgunj–Hetauda)   | मध्य तराई                   | 340 MW   |
| 5 | Western Terai (Butwal–Bhairahawa) | पश्चिमी तराई                | 290 MW   |
| 6 | Far-Western                       | सुदूरपश्चिम                  | 160 MW   |
| 7 | Karnali & Mid-West Hills          | कर्णाली र मध्यपहाड           | 130 MW   |
| 8 | Hilly Industrial Corridor          | पहाडी औद्योगिक करिडोर        | 175 MW   |

---

## API Endpoints

| Endpoint                  | Method | Description                     |
|---------------------------|--------|---------------------------------|
| `/api/grid/snapshot`      | GET    | Current grid state, all 8 zones |
| `/api/grid/zones`         | GET    | Static zone metadata            |
| `/api/forecast/`          | GET    | 72-hour demand/supply forecast  |
| `/api/ai/recommendations` | GET    | 3 AI optimization suggestions   |
| `/api/ai/chat`            | POST   | What-if scenario chat           |

Query parameters: `festival_mode=true`, `season=monsoon|dry`

---

## License

Built for hackathon demonstration. Data is simulated and does not represent actual NEA operations.

**Powered by AI REGO | Nepal Electricity Authority (NEA) | Simulated Demo**
