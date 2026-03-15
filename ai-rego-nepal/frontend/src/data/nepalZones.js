/**
 * Nepal Grid Zones — Geographic data with polygon boundaries
 * Based on NEA load dispatch regions.
 * Polygons are simplified representations of zone coverage areas.
 */

export const NEPAL_CENTER = [28.3949, 84.1240];
export const NEPAL_ZOOM = 7;

export const zones = [
  {
    id: 1,
    name: "Kathmandu Valley",
    nepali_name: "काठमाडौं उपत्यका",
    region: "Bagmati",
    capacity_mw: 480,
    primary_source: "hydro+import",
    key_substations: ["Katunje", "Balaju", "New Baneshwor"],
    center: [27.7172, 85.3240],
    polygon: [
      [27.80, 85.20], [27.82, 85.35], [27.78, 85.45],
      [27.65, 85.45], [27.60, 85.35], [27.62, 85.20],
    ],
  },
  {
    id: 2,
    name: "Pokhara & Gandaki",
    nepali_name: "पोखरा र गण्डकी",
    region: "Gandaki",
    capacity_mw: 210,
    primary_source: "hydro",
    key_substations: ["Pokhara Substation", "Damauli"],
    center: [28.2096, 83.9856],
    polygon: [
      [28.50, 83.60], [28.55, 84.10], [28.40, 84.30],
      [28.00, 84.25], [27.90, 83.80], [28.10, 83.55],
    ],
  },
  {
    id: 3,
    name: "Eastern Terai (Biratnagar)",
    nepali_name: "पूर्वी तराई",
    region: "Koshi",
    capacity_mw: 310,
    primary_source: "import+hydro",
    key_substations: ["Biratnagar", "Itahari", "Dhalkebar"],
    center: [26.4525, 87.2718],
    polygon: [
      [26.90, 86.50], [26.95, 87.50], [26.80, 87.90],
      [26.30, 87.90], [26.30, 86.80], [26.50, 86.50],
    ],
  },
  {
    id: 4,
    name: "Central Terai (Birgunj–Hetauda)",
    nepali_name: "मध्य तराई",
    region: "Madhesh",
    capacity_mw: 340,
    primary_source: "import",
    key_substations: ["Hetauda", "Pathlaiya", "Parwanipur"],
    center: [27.0000, 85.0000],
    polygon: [
      [27.20, 84.50], [27.25, 85.30], [27.15, 85.80],
      [26.80, 85.80], [26.75, 85.00], [26.85, 84.50],
    ],
  },
  {
    id: 5,
    name: "Western Terai (Butwal–Bhairahawa)",
    nepali_name: "पश्चिमी तराई",
    region: "Lumbini",
    capacity_mw: 290,
    primary_source: "hydro",
    key_substations: ["Butwal", "Bhairahawa", "Tinau"],
    center: [27.7000, 83.4500],
    polygon: [
      [27.90, 83.00], [27.95, 83.60], [27.80, 83.90],
      [27.40, 83.85], [27.35, 83.30], [27.50, 83.00],
    ],
  },
  {
    id: 6,
    name: "Far-Western (Dhangadhi–Mahendranagar)",
    nepali_name: "सुदूरपश्चिम",
    region: "Sudurpashchim",
    capacity_mw: 160,
    primary_source: "import+solar",
    key_substations: ["Attariya", "Mahendranagar"],
    center: [28.6942, 80.5936],
    polygon: [
      [29.10, 80.00], [29.15, 80.80], [29.00, 81.10],
      [28.40, 81.00], [28.35, 80.40], [28.60, 80.00],
    ],
  },
  {
    id: 7,
    name: "Karnali & Mid-West Hills",
    nepali_name: "कर्णाली र मध्यपहाड",
    region: "Karnali",
    capacity_mw: 130,
    primary_source: "hydro",
    key_substations: ["Surkhet", "Nepalgunj"],
    center: [28.6000, 81.6100],
    polygon: [
      [29.00, 81.20], [29.05, 82.00], [28.90, 82.40],
      [28.30, 82.30], [28.25, 81.60], [28.50, 81.20],
    ],
  },
  {
    id: 8,
    name: "Hilly Industrial Corridor (Hetauda–Muglin)",
    nepali_name: "पहाडी औद्योगिक करिडोर",
    region: "Bagmati",
    capacity_mw: 175,
    primary_source: "hydro",
    key_substations: ["Hetauda Industrial", "Muglin", "Mugling"],
    center: [27.6300, 84.8500],
    polygon: [
      [27.80, 84.50], [27.85, 84.90], [27.75, 85.15],
      [27.45, 85.10], [27.40, 84.70], [27.55, 84.45],
    ],
  },
];

/** Major rivers that power Nepal's hydropower */
export const rivers = [
  {
    name: "Koshi River",
    nepali_name: "कोशी नदी",
    coordinates: [
      [27.90, 87.10], [27.40, 87.00], [26.90, 86.90], [26.50, 86.95],
    ],
  },
  {
    name: "Gandaki River",
    nepali_name: "गण्डकी नदी",
    coordinates: [
      [28.60, 83.90], [28.20, 84.00], [27.70, 83.95], [27.30, 83.80],
    ],
  },
  {
    name: "Karnali River",
    nepali_name: "कर्णाली नदी",
    coordinates: [
      [29.20, 81.50], [28.80, 81.40], [28.30, 81.30], [27.80, 81.20],
    ],
  },
];

/** Status color mapping */
export const statusColors = {
  green: { fill: '#22c55e', border: '#16a34a', label: 'Normal', nepali: 'सामान्य' },
  yellow: { fill: '#eab308', border: '#ca8a04', label: 'Elevated', nepali: 'बढेको' },
  red: { fill: '#ef4444', border: '#dc2626', label: 'Near Capacity', nepali: 'क्षमता नजिक' },
  blue: { fill: '#3b82f6', border: '#2563eb', label: 'Surplus', nepali: 'अधिशेष' },
};
