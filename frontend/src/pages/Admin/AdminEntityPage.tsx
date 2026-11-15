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
  isBackendSynced = false,
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

        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {section.columns.map((column) => (
                  <th key={column.key} scope="col">{column.label}</th>
                ))}
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((record) => (
                <tr key={record.id}>
                  {section.columns.map((column) => (
                    <td key={column.key}>
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
                  <td className="admin-row-actions">
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

      <div className="admin-demo-notice" role="note">
        {isLoading
          ? "Menghubungkan ke database SIPENA..."
          : isBackendSynced
            ? "Terhubung ke database SIPENA — perubahan tersimpan langsung ke server."
            : "Tidak terhubung ke server backend SIPENA. Pastikan server backend aktif agar data tersimpan."}
      </div>
    </div>
  );
}

export default AdminEntityPage;
