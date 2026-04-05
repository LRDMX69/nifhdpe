export const APP_NAME = "NIF Technical";
export const APP_FULL_NAME = "NIF Technical Operations Suite";
export const CURRENCY_SYMBOL = "₦";
export const CURRENCY_CODE = "NGN";

export const PIPE_DIAMETERS = [20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315];

export const FITTING_TYPES = [
  "Elbow 90°",
  "Elbow 45°",
  "Tee",
  "Reducer",
  "Flange",
  "Coupling",
  "End Cap",
  "Saddle Clamp",
  "Ball Valve",
  "Gate Valve",
  "Union",
  "Adaptor",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  engineer: "Engineer",
  technician: "Technician",
  warehouse: "Warehouse",
  finance: "Finance",
  hr: "HR",
  reception_sales: "Reception / Sales",
  knowledge_manager: "Knowledge Manager",
  siwes_trainee: "SIWES Trainee",
  it_student: "IT Student",
  nysc_member: "NYSC Member",
};

export const ALL_ROLES = [
  "administrator",
  "engineer",
  "technician",
  "warehouse",
  "finance",
  "hr",
  "reception_sales",
  "knowledge_manager",
  "siwes_trainee",
  "it_student",
  "nysc_member",
] as const;

export type AppRole = (typeof ALL_ROLES)[number];

export const formatCurrency = (amount: number): string => {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
