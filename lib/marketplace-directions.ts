export const marketplaceDirections = [
  {
    transactionSide: "Buying",
    label: "I need transport",
    description: "Post freight you need moved now or soon. Suppliers respond with private offers.",
    href: "/platform/spot-requirements/new?type=transport",
    badge: "Transport requirement",
  },
  {
    transactionSide: "Buying",
    label: "I need storage",
    description: "Post a short-term storage requirement and compare private supplier offers.",
    href: "/platform/spot-requirements/new?type=storage",
    badge: "Storage requirement",
  },
  {
    transactionSide: "Supplying",
    label: "I have spare capacity",
    description: "Offer an available transport lane or warehouse space for buyers to bid on.",
    href: "/platform/listings/new",
    badge: "Capacity listing",
  },
  {
    transactionSide: "Buying",
    label: "I want supplier quotes",
    description: "Create a one-off or recurring tender for transport, storage or spot procurement. Suppliers respond privately.",
    href: "/platform/tenders/new",
    badge: "Tender requirement",
  },
] as const;
