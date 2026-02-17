import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPatch, apiPost, formatDate, truncate } from '../api'
import { RefreshCw, Send, MessageCircle, MapPin } from 'lucide-react'
import './Dashboard.css'

const CATEGORIES = ['All', 'Water & Drainage', 'Roads & Infrastructure', 'Electricity',
    'Public Transport', 'Education', 'Healthcare', 'Women Safety', 'Employment', 'Others']

export default function Grievances() {
    const [items, setItems] = useState([])
    const [pagination, setPagination] = useState({})
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('')
    const [category, setCategory] = useState('')
    const [page, setPage] = useState(1)
    const [modal, setModal] = useState(null)
    const [notifyModal, setNotifyModal] = useState(null)
    const [notifyMsg, setNotifyMsg] = useState('')
    const [sending, setSending] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await apiGet('/grievances', { page, limit: 20, search, status, category: category === 'All' ? '' : category })
            if (res.success) { setItems(res.data); setPagination(res.pagination) }
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [page, search, status, category])

    useEffect(() => { load() }, [load])

    const handleUpdate = async (id, newStatus, resolution) => {
        await apiPatch(`/grievances/${id}`, { status: newStatus, resolution })
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
                <h1>🔴 Issues / Grievances</h1>
                <p>Track and resolve voter issues raised via WhatsApp</p>
            </div>

            <div className="filters">
                <input className="input" placeholder="Search by name, ticket, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
                <select className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
                    <option value="">All Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                </select>
                <select className="input" value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}>
                    {CATEGORIES.map(c => <option key={c} value={c === 'All' ? '' : c}>{c}</option>)}
                </select>
                <button className="btn btn-outline btn-sm" onClick={load}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {loading ? <div className="loading"><div className="spinner" /></div> : items.length === 0 ? (
                <div className="empty-state"><div className="emoji">📭</div><p>No issues found</p></div>
            ) : (
                <div className="table-card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>Ticket</th><th>Name</th><th>📱 Phone</th><th>Category</th><th>Message</th><th>Booth</th><th>Location</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {items.map(g => (
                                    <tr key={g._id}>
                                        <td><strong className="accent">{g.ticketId}</strong></td>
                                        <td>{g.voterName}</td>
                                        <td><code>{g.phoneNumber}</code></td>
                                        <td><span className="category-tag">{g.category}</span></td>
                                        <td title={g.message}>{truncate(g.message, 25)}</td>
                                        <td>{g.partNumber}</td>
                                        <td>
                                            {g.googleMapsLink ? (
                                                <a href={g.googleMapsLink} target="_blank" rel="noopener noreferrer" className="location-link" title={g.actualAddress || 'View on Map'}>
                                                    <MapPin size={16} /> Spot
                                                </a>
                                            ) : '—'}
                                        </td>
                                        <td><span className={`status-badge ${g.status.replace(' ', '-')}`}>{g.status}</span></td>
                                        <td>{formatDate(g.createdAt)}</td>
                                        <td>
                                            <div className="action-btns">
                                                <button className="btn btn-sm btn-primary" onClick={() => setModal(g)}>Update</button>
                                                <button className="btn btn-sm btn-wa" onClick={() => { setNotifyModal(g); setNotifyMsg(`Hi ${g.voterName}, regarding your issue (${g.ticketId}) about "${g.category}":\n\n`) }}>
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

            {/* Update Status Modal */}
            {modal && <UpdateModal item={modal} onUpdate={handleUpdate} onClose={() => setModal(null)} statuses={['Open', 'In Progress', 'Resolved']} />}

            {/* Notify Modal */}
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

function UpdateModal({ item, onUpdate, onClose, statuses }) {
    const [s, setS] = useState(item.status)
    const [r, setR] = useState(item.resolution || '')
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>Update: {item.ticketId || item.suggestionId || item.volunteerId}</h3>
                <div className="form-group">
                    <label>Status</label>
                    <select className="input" value={s} onChange={e => setS(e.target.value)}>
                        {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Notes / Resolution</label>
                    <textarea className="input" rows={3} value={r} onChange={e => setR(e.target.value)} />
                </div>
                <div className="modal-actions">
                    <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => onUpdate(item._id, s, r)}>Save</button>
                </div>
            </div>
        </div>
    )
}

export { UpdateModal }
