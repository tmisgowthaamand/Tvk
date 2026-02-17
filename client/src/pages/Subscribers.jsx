import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, formatDate } from '../api'
import { RefreshCw, Send, MessageCircle, MapPin } from 'lucide-react'
import './Dashboard.css'

export default function Subscribers() {
    const [items, setItems] = useState([])
    const [pagination, setPagination] = useState({})
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [notifyModal, setNotifyModal] = useState(null)
    const [notifyMsg, setNotifyMsg] = useState('')
    const [sending, setSending] = useState(false)
    const [broadcastModal, setBroadcastModal] = useState(false)
    const [broadcastMsg, setBroadcastMsg] = useState('')
    const [broadcastSending, setBroadcastSending] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await apiGet('/subscribers', { page, limit: 20, search })
            if (res.success) { setItems(res.data); setPagination(res.pagination) }
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [page, search])

    useEffect(() => { load() }, [load])

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

    const handleBroadcast = async () => {
        if (!broadcastMsg.trim()) return
        setBroadcastSending(true)
        let sent = 0, failed = 0
        for (const sub of items) {
            try {
                await apiPost('/admin/notify', { phoneNumber: sub.phoneNumber, message: broadcastMsg })
                sent++
            } catch (e) { failed++ }
        }
        alert(`📢 Broadcast complete!\n✅ Sent: ${sent}\n❌ Failed: ${failed}`)
        setBroadcastSending(false)
        setBroadcastModal(false)
        setBroadcastMsg('')
    }

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div>
                    <h1>📢 Campaign Subscribers</h1>
                    <p>People who opted to receive campaign updates</p>
                </div>
                <button className="btn btn-primary" onClick={() => setBroadcastModal(true)}>
                    <Send size={14} /> Broadcast to All
                </button>
            </div>

            <div className="filters">
                <input className="input" placeholder="Search by name or phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
                <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
            </div>

            {loading ? <div className="loading"><div className="spinner" /></div> : items.length === 0 ? (
                <div className="empty-state"><div className="emoji">📭</div><p>No subscribers yet</p></div>
            ) : (
                <div className="table-card">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>ID</th><th>Name</th><th>📱 Phone</th><th>Booth</th><th>Location</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {items.map(s => (
                                    <tr key={s._id}>
                                        <td><strong className="accent">{s.subscriberId}</strong></td>
                                        <td>{s.voterName}</td>
                                        <td><code>{s.phoneNumber}</code></td>
                                        <td>{s.voterId}</td>
                                        <td>{s.partNumber}</td>
                                        <td>
                                            {s.googleMapsLink ? (
                                                <a href={s.googleMapsLink} target="_blank" rel="noopener noreferrer" className="location-link" title={s.actualAddress || 'View on Map'}>
                                                    <MapPin size={16} /> Spot
                                                </a>
                                            ) : '—'}
                                        </td>
                                        <td><span className="status-badge Active">{s.status || 'Active'}</span></td>
                                        <td>{formatDate(s.createdAt)}</td>
                                        <td>
                                            <button className="btn btn-sm btn-wa" onClick={() => { setNotifyModal(s); setNotifyMsg(`Hi ${s.voterName},\n\n`) }}>
                                                <MessageCircle size={12} /> Notify
                                            </button>
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

            {/* Individual Notify */}
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

            {/* Broadcast Modal */}
            {broadcastModal && (
                <div className="modal-overlay" onClick={() => setBroadcastModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>📢 Broadcast to All Subscribers</h3>
                        <p>This will send a WhatsApp message to <strong>{pagination.total || items.length}</strong> subscriber(s) on this page.</p>
                        <textarea className="input" rows={5} value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Type your broadcast message..." />
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setBroadcastModal(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={broadcastSending || !broadcastMsg.trim()} onClick={handleBroadcast}>
                                <Send size={14} /> {broadcastSending ? 'Broadcasting...' : 'Send to All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
