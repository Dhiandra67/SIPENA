import type { AdminEntityPageProps } from "./types";

function AdminEntityPage({
  section,
  currentPeriod,
  rows,
  visibleRows,
  search,
  onSearchChange,
  onAdd,
  onDetails,
  onEdit,
  onDelete,
  toolbarFilters,
  fileActions,
  footerNote,
  renderCell,
  isLoading = false,
}: AdminEntityPageProps) {
  return (
    <div className="admin-panel">
      <section className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">SIPENA · ADMIN</span>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </div>
        <span className="admin-active-period">{currentPeriod}</span>
      </section>

      <section className="admin-records-card" aria-label={section.title}>
        <div className="admin-records-toolbar">
          <label className="admin-search">
            <span className="visually-hidden">Cari {section.title.toLocaleLowerCase("id")}</span>
            <input
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={`Cari ${section.title.toLocaleLowerCase("id")}...`}
              type="search"
              value={search}
            />
          </label>
          {toolbarFilters}
          {fileActions}
          <button className="admin-primary-button" onClick={onAdd} type="button">
            + {section.addLabel}
          </button>
        </div>

        <div className="admin-table-scroll admin-entity-scroll admin-master-data-scroll">
          <table
            className={`admin-table admin-entity-table admin-master-data-table${section.mobileVisibleColumns ? " admin-custom-mobile-table" : ""}`}
          >
            <thead>
              <tr>
                {section.columns.map((column) => (
                  <th
                    data-column-key={column.key}
                    data-mobile-hidden={
                      section.mobileVisibleColumns &&
                      !section.mobileVisibleColumns.includes(column.key)
                        ? ""
                        : undefined
                    }
                    key={column.key}
                    scope="col"
                  >
                    {column.label}
                  </th>
                ))}
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((record) => (
                <tr key={record.id}>
                  {section.columns.map((column) => (
                    <td
                      data-column-key={column.key}
                      data-label={column.label}
                      data-mobile-hidden={
                        section.mobileVisibleColumns &&
                        !section.mobileVisibleColumns.includes(column.key)
                          ? ""
                          : undefined
                      }
                      key={column.key}
                      title={
                          record[column.key] == null
                            ? undefined
                            : String(record[column.key])
                      }
                    >
                      {renderCell?.(record, column.key) ??
                        (column.key === "status"
                          ? (
                            <span className={`admin-status ${record[column.key] === "Aktif" ? "active" : "inactive"}`}>
                              {record[column.key]}
                            </span>
                          )
                          : record[column.key] ?? "—")}
                    </td>
                  ))}
                  <td className="admin-row-actions" data-label="Aksi">
                    <button
                      aria-label={`Lihat ${section.title}: ${record.name ?? record.grade ?? record.code ?? record.nis ?? record.teacher ?? ""}`}
                      onClick={() => onDetails(record)}
                      type="button"
                    >
                      Detail
                    </button>
                    <button onClick={() => onEdit(record)} type="button">Edit</button>
                    <button className="danger" onClick={() => onDelete(record)} type="button">Hapus</button>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td className="admin-empty" colSpan={section.columns.length + 1}>
                    {isLoading ? "Memuat data dari database..." : "Data tidak ditemukan."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="admin-records-footer">
          <span>{search ? `${visibleRows.length} hasil ditemukan` : `${rows.length} data`}</span>
          {footerNote && <span>{footerNote}</span>}
        </footer>
      </section>

    </div>
  );
}

export default AdminEntityPage;
