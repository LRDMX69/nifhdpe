/**
 * Per-role guided tour definitions. Each tour is a list of steps
 * pointing at CSS selectors that exist on the role's primary
 * screens. Tours run once per role on first dashboard visit; the
 * user can replay any tour from the Help menu.
 */
export interface TourStep {
  element?: string;
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
}

export interface RoleTour {
  id: string;
  label: string;
  steps: TourStep[];
}

const COMMON_WELCOME: TourStep = {
  title: "Welcome to NIF Operations",
  description:
    "Quick 60-second tour of the parts of the app you'll use most. You can replay this tour any time from the Help button (?) in any page header.",
};

const COMMON_DASHBOARD: TourStep = {
  element: '[data-tour="needs-attention"]',
  title: "Needs Your Attention",
  description: "This panel surfaces items waiting on you across every module. Tap a row to jump straight to the record.",
};

const COMMON_NAV: TourStep = {
  element: 'nav[class*="bottom"]',
  title: "Quick navigation",
  description: "The bottom bar gives you one-tap access to the five most-used screens for your role. The full menu is in the top-left hamburger.",
  side: "top",
};

export const ROLE_TOURS: Record<string, RoleTour> = {
  administrator: {
    id: "admin-v1",
    label: "Administrator tour",
    steps: [
      COMMON_WELCOME,
      COMMON_DASHBOARD,
      { title: "Approve new users", description: "New sign-ups land in Settings → Pending Approval. You can grant up to two roles per user." },
      { title: "AI monitors quietly", description: "AI anomaly checks run in the background and flag unusual claims, expenses, and attendance — flagged items appear in your Needs Attention queue." },
      COMMON_NAV,
    ],
  },
  hr: {
    id: "hr-v1",
    label: "HR tour",
    steps: [
      COMMON_WELCOME,
      COMMON_DASHBOARD,
      { title: "Leaves Inbox", description: "Inside HR → Leaves you'll see an Inbox tab (requests awaiting you) and a My Submissions tab (your own requests)." },
      { title: "Attendance is GPS-gated", description: "Check-ins only succeed inside office geofence. Check-outs are blocked before 5 PM." },
      COMMON_NAV,
    ],
  },
  finance: {
    id: "finance-v1",
    label: "Finance tour",
    steps: [
      COMMON_WELCOME,
      COMMON_DASHBOARD,
      { title: "Worker Claims need proof", description: "Every claim must have an uploaded receipt or photo. AI-flagged claims are highlighted in orange." },
      { title: "Close periods carefully", description: "Once an accounting period is closed, expenses inside it can no longer be edited (except by the system admin)." },
      COMMON_NAV,
    ],
  },
  engineer: {
    id: "engineer-v1",
    label: "Engineer tour",
    steps: [
      COMMON_WELCOME,
      COMMON_DASHBOARD,
      { title: "Submit field notes daily", description: "Drop unstructured notes into Field Reports — the AI turns them into formal reports you can sign and send." },
      { title: "Deliveries need geofence confirmation", description: "Mark a delivery Delivered only inside the 300m site geofence — otherwise it stays Dispatched." },
      COMMON_NAV,
    ],
  },
  technician: {
    id: "tech-v1",
    label: "Technician tour",
    steps: [
      COMMON_WELCOME,
      { title: "Check in first", description: "Open HR and check in when you arrive on site — you can't submit reports without it." },
      { title: "Capture site evidence", description: "Field Reports → New: snap photos, add notes. GPS and timestamp are stamped automatically." },
      { title: "Request equipment", description: "Need a tool? Equipment → Request. You'll see the approval status on your dashboard." },
      COMMON_NAV,
    ],
  },
  warehouse: {
    id: "warehouse-v1",
    label: "Warehouse tour",
    steps: [
      COMMON_WELCOME,
      COMMON_DASHBOARD,
      { title: "Post a GRN on arrival", description: "When goods arrive, post a Goods Received Note against the matching Purchase Order — inventory updates automatically." },
      { title: "Quick Find a part", description: "Inventory → Quick Find: type a part code to see exactly which rack and zone holds it." },
      COMMON_NAV,
    ],
  },
  reception_sales: {
    id: "sales-v1",
    label: "Sales tour",
    steps: [
      COMMON_WELCOME,
      COMMON_DASHBOARD,
      { title: "Opportunities → Quotations → Invoices", description: "Qualify the opportunity, convert it to a quotation, then hand it to Finance for invoicing — the trail stays linked." },
      { title: "AI scans bids hourly", description: "New tenders matching your industry land automatically under Opportunities." },
      COMMON_NAV,
    ],
  },
};

export function getRoleTour(role: string | undefined | null): RoleTour | undefined {
  if (!role) return undefined;
  return ROLE_TOURS[role];
}

export function tourSeenKey(tourId: string) {
  return `nif.tour.seen.${tourId}`;
}

export function hasSeenTour(tourId: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(tourSeenKey(tourId)) === "1";
}

export function markTourSeen(tourId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(tourSeenKey(tourId), "1");
}

export function resetTourSeen(tourId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(tourSeenKey(tourId));
}