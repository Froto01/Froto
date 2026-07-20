export const LOGISTICS_LISTINGS = [
  {
    id: "w1",
    type: "Warehouse Space",
    name: "Sydney 3PL - Dry Storage",
    capacity: "120 pallets available",
    currentBid: 18.0,
    location: "Sydney, NSW",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "t1",
    type: "Transport Lane",
    name: "MEL -> BNE Linehaul",
    capacity: "22 pallet spots",
    currentBid: 95.0,
    location: "Melbourne to Brisbane",
    image:
      "https://images.unsplash.com/photo-1606925797300-0fac24dce3d3?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "w2",
    type: "Warehouse Space",
    name: "Brisbane 3PL - Chilled",
    capacity: "60 pallets (2C-8C)",
    currentBid: 29.0,
    location: "Brisbane, QLD",
    image:
      "https://images.unsplash.com/photo-1600289031461-1b5cfb4f18b8?q=80&w=1200&auto=format&fit=crop",
  },
];

export const MOCK_TENDERS = [
  {
    id: "tender1",
    title: "FMCG Monthly Replenishment - East Coast",
    productCost: 41000,
    logisticsCost: 3500,
  },
  {
    id: "tender2",
    title: "Pharma Cold Chain - National",
    productCost: 58000,
    logisticsCost: 9200,
  },
];

export const DEMO_BIDS = [
  { bidder: "Carrier A", amount: 210, time: "12 min ago" },
  { bidder: "Carrier B", amount: 195, time: "28 min ago" },
  { bidder: "Carrier C", amount: 180, time: "45 min ago" },
];
