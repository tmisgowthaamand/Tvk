import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, formatDate, truncate } from '../api'
import { Vote, AlertCircle, Lightbulb, Heart, Bell, CheckCircle, ExternalLink, MessageCircle } from 'lucide-react'
import './Dashboard.css'

export default function Dashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        apiGet('/admin/dashboard').then(res => {
            if (res.success) setData(res.data)
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="loading"><div className="spinner" /></div>
    if (!data) return <div className="error-state">Failed to load dashboard</div>

    const stats = [
        { label: 'Total Voters', value: data.totalVoters, icon: <Vote size={22} />, color: 'green' },
        { label: 'Open Issues', value: data.grievances.open, icon: <AlertCircle size={22} />, color: 'red' },
        { label: 'Total Issues', value: data.grievances.total, icon: <AlertCircle size={22} />, color: 'blue' },
        { label: 'Suggestions', value: data.suggestions.total, icon: <Lightbulb size={22} />, color: 'orange' },
        { label: 'Volunteers', value: data.volunteers.total, icon: <Heart size={22} />, color: 'purple' },
        { label: 'Subscribers', value: data.subscribers.total, icon: <Bell size={22} />, color: 'green' },
        { label: 'Resolved', value: data.grievances.resolved, icon: <CheckCircle size={22} />, color: 'green' },
        { label: 'Pending Vol.', value: data.volunteers.pending, icon: <Heart size={22} />, color: 'orange' }
    ]

    return (
        <div className="dashboard fade-in">

            {/* ── Welcome Banner ── */}
            <div className="welcome-banner">
                <div className="banner-bg">
                    <div className="banner-orb orb-1" />
                    <div className="banner-orb orb-2" />
                    <div className="banner-orb orb-3" />
                    <div className="banner-grid" />
                </div>
                <div className="banner-content">
                    <div className="banner-badge">
                        <span className="badge-dot" /> LIVE DASHBOARD
                    </div>
                    <h1 className="banner-title">
                        <span className="banner-party">TVK</span> Voter Support System
                    </h1>
                    <p className="banner-subtitle">
                        <strong>Venkatraman</strong> — TVK Candidate, Kavundampalayam Assembly
                    </p>
                    <p className="banner-desc">
                        Empowering every voter with direct access to their representative.
                        Track issues, suggestions, and volunteers from one unified dashboard.
                    </p>
                    <div className="banner-stats">
                        <div className="banner-stat-item">
                            <span className="banner-stat-num">{(data.totalVoters || 0).toLocaleString()}</span>
                            <span className="banner-stat-label">Voters</span>
                        </div>
                        <div className="banner-stat-divider" />
                        <div className="banner-stat-item">
                            <span className="banner-stat-num">{(data.grievances.total || 0).toLocaleString()}</span>
                            <span className="banner-stat-label">Issues</span>
                        </div>
                        <div className="banner-stat-divider" />
                        <div className="banner-stat-item">
                            <span className="banner-stat-num">{(data.volunteers.total || 0).toLocaleString()}</span>
                            <span className="banner-stat-label">Volunteers</span>
                        </div>
                        <div className="banner-stat-divider" />
                        <div className="banner-stat-item">
                            <span className="banner-stat-num">{(data.subscribers.total || 0).toLocaleString()}</span>
                            <span className="banner-stat-label">Subscribers</span>
                        </div>
                    </div>
                    <div className="banner-actions">
                        <button className="btn-banner primary" onClick={() => navigate('/chat')}>
                            <MessageCircle size={16} /> Open Chat Simulator
                        </button>
                        <button className="btn-banner outline" onClick={() => navigate('/grievances')}>
                            <AlertCircle size={16} /> View Issues
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="section-title">📊 Overview</div>
            <div className="stats-grid">
                {stats.map((s, i) => (
                    <div key={i} className={`stat-card ${s.color}`} style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-value">{(s.value || 0).toLocaleString()}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Recent Grievances */}
            <div className="table-card">
                <div className="table-header">
                    <h3>🔴 Recent Issues</h3>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/grievances')}>View All →</button>
                </div>
                {data.recentGrievances.length === 0 ? (
                    <div className="empty-state"><div className="emoji">📭</div><p>No issues yet</p></div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>Ticket</th><th>Name</th><th>📱 Phone</th><th>Category</th><th>Message</th><th>Status</th><th>Date</th></tr></thead>
                            <tbody>
                                {data.recentGrievances.map((g, i) => (
                                    <tr key={i}>
                                        <td><strong className="accent">{g.ticketId}</strong></td>
                                        <td>{g.voterName}</td>
                                        <td><code>{g.phoneNumber}</code></td>
                                        <td><span className="category-tag">{g.category}</span></td>
                                        <td>{truncate(g.message, 30)}</td>
                                        <td><span className={`status-badge ${g.status.replace(' ', '-')}`}>{g.status}</span></td>
                                        <td>{formatDate(g.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Suggestions */}
            <div className="table-card">
                <div className="table-header">
                    <h3>💡 Recent Suggestions</h3>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/suggestions')}>View All →</button>
                </div>
                {data.recentSuggestions.length === 0 ? (
                    <div className="empty-state"><div className="emoji">📭</div><p>No suggestions yet</p></div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>ID</th><th>Name</th><th>📱 Phone</th><th>Suggestion</th><th>Status</th><th>Date</th></tr></thead>
                            <tbody>
                                {data.recentSuggestions.map((s, i) => (
                                    <tr key={i}>
                                        <td><strong className="accent">{s.suggestionId}</strong></td>
                                        <td>{s.voterName}</td>
                                        <td><code>{s.phoneNumber}</code></td>
                                        <td>{truncate(s.message, 40)}</td>
                                        <td><span className={`status-badge ${s.status}`}>{s.status}</span></td>
                                        <td>{formatDate(s.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Volunteers */}
            <div className="table-card">
                <div className="table-header">
                    <h3>🤝 Recent Volunteers</h3>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/volunteers')}>View All →</button>
                </div>
                {data.recentVolunteers.length === 0 ? (
                    <div className="empty-state"><div className="emoji">📭</div><p>No volunteers yet</p></div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>ID</th><th>Name</th><th>📱 Phone</th><th>Booth</th><th>Assembly</th><th>Status</th><th>Date</th></tr></thead>
                            <tbody>
                                {data.recentVolunteers.map((v, i) => (
                                    <tr key={i}>
                                        <td><strong className="accent">{v.volunteerId}</strong></td>
                                        <td>{v.voterName}</td>
                                        <td><code>{v.phoneNumber}</code></td>
                                        <td>{v.partNumber}</td>
                                        <td>{v.assemblyName}</td>
                                        <td><span className={`status-badge ${v.status}`}>{v.status}</span></td>
                                        <td>{formatDate(v.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
