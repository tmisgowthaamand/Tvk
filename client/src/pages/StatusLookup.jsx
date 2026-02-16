import { useState } from 'react'
import { apiGet, formatDate } from '../api'
import { Search } from 'lucide-react'
import './Dashboard.css'
import './StatusLookup.css'

export default function StatusLookup() {
    const [input, setInput] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSearch() {
        const id = input.trim()
        if (!id) return
        setLoading(true)
        setResult(null)
        setError('')

        try {
            const res = await apiGet(`/status/${id}`)
            if (res.success) {
                setResult(res)
            } else {
                setError('ID not found. Check and try again.')
            }
        } catch {
            setError('ID not found or server error.')
        }
        setLoading(false)
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🔍 Status Lookup</h1>
                <p>Check status by Reference ID (MBR...) or Ticket ID (GRV...)</p>
            </div>

            <div className="lookup-card">
                <div className="lookup-input-group">
                    <Search size={20} className="lookup-icon" />
                    <input
                        className="lookup-input"
                        placeholder="Enter MBR12345 or GRV56789..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="btn btn-accent" onClick={handleSearch} disabled={loading}>
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {error && (
                    <div className="lookup-error">
                        ❌ {error}
                    </div>
                )}

                {result && (
                    <div className="lookup-result fade-in">
                        {result.type === 'membership' ? (
                            <>
                                <div className="result-header green">
                                    <span className="result-type">✅ Membership Request</span>
                                </div>
                                <div className="result-body">
                                    <div className="result-row"><span>Reference ID</span><strong>{result.data.referenceId}</strong></div>
                                    <div className="result-row"><span>Name</span><strong>{result.data.name}</strong></div>
                                    <div className="result-row"><span>Voter ID</span><code>{result.data.voterId}</code></div>
                                    <div className="result-row"><span>Mobile</span><strong>{result.data.mobile || '-'}</strong></div>
                                    <div className="result-row"><span>Area</span><strong>{result.data.area || '-'}</strong></div>
                                    <div className="result-row">
                                        <span>Status</span>
                                        <span className={`status-badge ${result.data.status}`}>{result.data.status}</span>
                                    </div>
                                    <div className="result-row"><span>Submitted</span><strong>{formatDate(result.data.createdAt)}</strong></div>
                                    <div className="result-row"><span>Last Updated</span><strong>{formatDate(result.data.updatedAt)}</strong></div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="result-header blue">
                                    <span className="result-type">📌 Grievance</span>
                                </div>
                                <div className="result-body">
                                    <div className="result-row"><span>Ticket ID</span><strong>{result.data.ticketId}</strong></div>
                                    <div className="result-row"><span>Voter Name</span><strong>{result.data.voterName}</strong></div>
                                    <div className="result-row"><span>Message</span><strong>{result.data.message}</strong></div>
                                    <div className="result-row">
                                        <span>Status</span>
                                        <span className={`status-badge ${result.data.status.replace(' ', '-')}`}>{result.data.status}</span>
                                    </div>
                                    <div className="result-row"><span>Submitted</span><strong>{formatDate(result.data.createdAt)}</strong></div>
                                    {result.data.resolution && (
                                        <div className="result-row"><span>Resolution</span><strong>{result.data.resolution}</strong></div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
