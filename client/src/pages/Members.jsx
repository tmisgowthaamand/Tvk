import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPatch, formatDate, truncate } from '../api'
import { RefreshCw } from 'lucide-react'
import './Dashboard.css'

export default function Members() {
    const [members, setMembers] = useState([])
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('')
    const [page, setPage] = useState(1)
    const [modal, setModal] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await apiGet('/member-requests', { page, limit: 15, search, status: filter })
            if (res.success) {
                setMembers(res.data)
                setPagination(res.pagination)
            }
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [page, search, filter])

    useEffect(() => { load() }, [load])

    async function handleUpdate() {
        if (!modal) return
        try {
            const res = await apiPatch(`/member-requests/${modal.id}`, {
                status: modal.status,
                notes: modal.notes
            })
            if (res.success) {
                setModal(null)
                load()
            }
        } catch (e) { console.error(e) }
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>👥 Member Requests</h1>
                <p>Manage and review membership applications</p>
            </div>

            <div className="table-card">
                <div className="table-header">
                    <h3>All Requests</h3>
                    <div className="table-toolbar">
                        <input
                            className="search-input"
                            placeholder="🔍 Search name, voter ID..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                        />
                        <select className="filter-select" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}>
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <button className="btn btn-accent btn-sm" onClick={load}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner" /></div>
                ) : members.length === 0 ? (
                    <div className="empty-state">
                        <div className="emoji">📭</div>
                        <p>No member requests found</p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ref ID</th><th>Name</th><th>Voter ID</th><th>Mobile</th>
                                    <th>Area</th><th>Status</th><th>Date</th><th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((m) => (
                                    <tr key={m._id}>
                                        <td><strong className="accent">{m.referenceId}</strong></td>
                                        <td>{m.name}</td>
                                        <td><code>{m.voterId}</code></td>
                                        <td>{m.mobile || '-'}</td>
                                        <td>{truncate(m.area, 22)}</td>
                                        <td><span className={`status-badge ${m.status}`}>{m.status}</span></td>
                                        <td>{formatDate(m.createdAt)}</td>
                                        <td>
                                            <button
                                                className="btn btn-accent btn-sm"
                                                onClick={() => setModal({ id: m._id, status: m.status, notes: '' })}
                                            >
                                                Update
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="pagination">
                    <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
                    <div className="page-btns">
                        <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <button className="btn btn-outline btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {modal && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
                    <div className="modal">
                        <h3>👥 Update Member Request</h3>
                        <div className="form-group">
                            <label>Status</label>
                            <select value={modal.status} onChange={e => setModal({ ...modal, status: e.target.value })}>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Admin Notes</label>
                            <textarea
                                placeholder="Add notes..."
                                value={modal.notes}
                                onChange={e => setModal({ ...modal, notes: e.target.value })}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-accent" onClick={handleUpdate}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
