import Link from "next/link";
import StatusPill from "./StatusPill";
import SortIcon from "./SortIcon";
import type { ApiReturnRow, SortBy, SortDir } from "../returns.types";
import { formatCreatedAt } from "../returns.utils";

type ReturnsTableProps = {
  loading: boolean;
  pagedRows: ApiReturnRow[];
  sortBy: SortBy;
  sortDir: SortDir;
  onToggleSort: (next: SortBy) => void;
};

export default function ReturnsTable({
  loading,
  pagedRows,
  sortBy,
  sortDir,
  onToggleSort,
}: ReturnsTableProps) {
  const headerBtn = "inline-flex items-center select-none hover:text-slate-900";

  return (
    <div className="rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-4 py-3">
                <button
                  type="button"
                  className={headerBtn}
                  onClick={() => onToggleSort("return_id")}
                  title="Sort by Return ID"
                >
                  Return number
                  <SortIcon dir={sortBy === "return_id" ? sortDir : null} />
                </button>
              </th>

              <th className="px-4 py-3">
                <button
                  type="button"
                  className={headerBtn}
                  onClick={() => onToggleSort("order_id")}
                  title="Sort by Order ID"
                >
                  Order number
                  <SortIcon dir={sortBy === "order_id" ? sortDir : null} />
                </button>
              </th>

              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>

              <th className="px-4 py-3">
                <button
                  type="button"
                  className={headerBtn}
                  onClick={() => onToggleSort("created_at")}
                  title="Sort by Created At"
                >
                  Created at
                  <SortIcon dir={sortBy === "created_at" ? sortDir : null} />
                </button>
              </th>

              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={6}>
                  No return requests.
                </td>
              </tr>
            ) : (
              pagedRows.map((r) => {
                const returnNo = r.return_number || `#${r.id}`;
                const orderNo =
                  r.order_number ||
                  (r.order_id != null ? String(r.order_id) : "—");
                const email = r.email || "—";
                const st = (r.status || "—").toLowerCase();
                const createdAt = formatCreatedAt(r);

                return (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-mono">{returnNo}</td>
                    <td className="px-4 py-3 font-mono">{orderNo}</td>
                    <td className="px-4 py-3">{email}</td>
                    <td className="px-4 py-3">
                      <StatusPill value={st} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{createdAt}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="text-blue-600 hover:underline"
                        href={`/admin/returns/${r.id}`}
                      >
                        View / Approve
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}