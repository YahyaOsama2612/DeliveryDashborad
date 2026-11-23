import { Eye } from "lucide-react";
import { Button } from "../../components/ui/button";

const ZoneNameCell = ({ zone }) => (
  <div className="flex flex-col">
    <span className="font-semibold">{zone.name || "Unnamed zone"}</span>
    {zone.nameAr && (
      <span className="text-xs text-muted-foreground" dir="rtl">
        {zone.nameAr}
      </span>
    )}
  </div>
);

const ZoneStatusBadge = ({ status }) => {
  const isActive =
    status === "active" || status === true || status === 1;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        isActive
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const ZoneTableColumns = ({ onShowDetails }) => [
  {
    id: "zone",
    header: "Zone",
    cell: ({ row }) => <ZoneNameCell zone={row.original} />,
  },
  {
    accessorKey: "coverageAreaRadiusKm",
    header: "Radius",
    cell: ({ row }) => `${row.original.coverageAreaRadiusKm ?? "—"} km`,
  },
  {
    accessorKey: "deliveryFee",
    header: "Delivery fee",
  },
  {
    accessorKey: "minOrderAmount",
    header: "Min. order",
  },
  {
    id: "statusBadge",
    header: "Status",
    cell: ({ row }) => <ZoneStatusBadge status={row.original.status} />,
  },
  
];

export default ZoneTableColumns;
