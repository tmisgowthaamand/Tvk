import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPatch, apiPost, formatDate } from '../api'
import { RefreshCw, Send, MessageCircle, MapPin } from 'lucide-react'
import { UpdateModal } from './Grievances'
import './Dashboard.css'

export default function Volunteers() {
    const [items, setItems] = useState([])
    const [pagination, setPagination] = useState({})
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('')
    const [page, setPage] = useState(1)
    const [modal, setModal] = useState(null)
    const [notifyModal, setNotifyModal] = useState(null)
    const [notifyMsg, setNotifyMsg] = useState('')
    const [sending, setSending] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await apiGet('/volunteers', { page, limit: 20, search, status })
            if (res.success) { setItems(res.data); setPagination(res.pagination) }
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [page, search, status])

    useEffect(() => { load() }, [load])

    const handleUpdate = async (id, newStatus, notes) => {
        await apiPatch(`/volunteers/${id}`, { status: newStatus, notes })
        setModal(null)
        load()
    }

    const handleNotify = async (phoneNumber, message) => {
        setSending(true)
        try {
            await apiPost('/admin/notify', { phoneNumber, message })
            alert('✅ Notification sent!')
        } catch (e) { alert('❌ Failed to send') }
        setSending(false)
        setNotifyModal(null)
        setNotifyMsg('')
    }

    return (
        <div className="page fade-in">
            <div className="page-header">
                <h1>🤝 Volunteers</h1>
                <p>People who volunteered to support TVK</p>
            </div>

            <div className="filters">
                <input className="input" placeholder="Search by name, ID, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
                <select className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                </select>
                <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
            </div>

            {loading ? <div className="loading"><div className="spinner" /></div> : items.length === 0 ? (
                <div className="empty-state"><div className="emoji">📭</div><p>No volunteers yet</p></div>
            ) : (
                <div className="table-card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>ID</th><th>Name</th><th>📱 Phone</th><th>Booth</th><th>Location</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {items.map(v => (
                                    <tr key={v._id}>
                                        <td><strong className="accent">{v.volunteerId}</strong></td>
                                        <td>{v.voterName}</td>
                                        <td><code>{v.phoneNumber}</code></td>
                                        <td>{v.voterId}</td>
                                        <td>{v.partNumber}</td>
                                        <td>
                                            {v.googleMapsLink ? (
                                                <a href={v.googleMapsLink} target="_blank" rel="noopener noreferrer" className="location-link" title={v.actualAddress || 'View on Map'}>
                                                    <MapPin size={16} /> Spot
                                                </a>
                                            ) : '—'}
                                        </td>
                                        <td><span className={`status-badge ${v.status}`}>{v.status}</span></td>
                                        <td>{formatDate(v.createdAt)}</td>
                                        <td>
                                            <div className="action-btns">
                                                <button className="btn btn-sm btn-primary" onClick={() => setModal(v)}>Update</button>
                                                <button className="btn btn-sm btn-wa" onClick={() => { setNotifyModal(v); setNotifyMsg(`Hi ${v.voterName}, regarding your volunteer registration (${v.volunteerId}):\n\n`) }}>
                                                    <MessageCircle size={12} /> Notify
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="pagination">
                            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            <span className="page-info">Page {page} of {pagination.totalPages} ({pagination.total} total)</span>
                            <button className="btn btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </div>
            )}

            {modal && <UpdateModal item={modal} onUpdate={handleUpdate} onClose={() => setModal(null)} statuses={['Pending', 'Approved', 'Rejected']} />}

            {notifyModal && (
                <div className="modal-overlay" onClick={() => setNotifyModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>📱 Send WhatsApp Notification</h3>
                        <p>To: <strong>{notifyModal.voterName}</strong> ({notifyModal.phoneNumber})</p>
                        <textarea className="input" rows={5} value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} placeholder="Type your message..." />
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setNotifyModal(null)}>Cancel</button>
                            <button className="btn btn-wa" disabled={sending || !notifyMsg.trim()} onClick={() => handleNotify(notifyModal.phoneNumber, notifyMsg)}>
                                <Send size={14} /> {sending ? 'Sending...' : 'Send via WhatsApp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
