import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '../api'
import { RefreshCw } from 'lucide-react'
import './Dashboard.css'

export default function Voters() {
    const [voters, setVoters] = useState([])
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [gender, setGender] = useState('')
    const [page, setPage] = useState(1)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await apiGet('/voters', { page, limit: 20, search, gender })
            if (res.success) {
                setVoters(res.data)
                setPagination(res.pagination)
            }
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [page, search, gender])

    useEffect(() => { load() }, [load])

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>🗳️ Voter Database</h1>
                <p>Browse registered voters (Read-Only from DB1)</p>
            </div>

            <div className="table-card">
                <div className="table-header">
                    <h3>Voters — DB1 (Read Only) 🔒</h3>
                    <div className="table-toolbar">
                        <input
                            className="search-input"
                            placeholder="🔍 Name or Voter ID..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                        />
                        <select className="filter-select" value={gender} onChange={e => { setGender(e.target.value); setPage(1) }}>
                            <option value="">All Gender</option>
                            <option value="M">♂ Male</option>
                            <option value="F">♀ Female</option>
                        </select>
                        <button className="btn btn-accent btn-sm" onClick={load}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner" /></div>
                ) : voters.length === 0 ? (
                    <div className="empty-state">
                        <div className="emoji">🔍</div>
                        <p>No voters found matching your search</p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Voter ID</th><th>Name</th><th>Age</th><th>Gender</th>
                                    <th>Relation</th><th>Assembly</th><th>District</th>
                                </tr>
                            </thead>
                            <tbody>
                                {voters.map((v, i) => (
                                    <tr key={v._id || i}>
                                        <td><code>{v.voterId}</code></td>
                                        <td><strong>{v.name}</strong></td>
                                        <td>{v.age || '-'}</td>
                                        <td>{v.gender === 'M' ? '♂ Male' : '♀ Female'}</td>
                                        <td>{v.relationName || '-'} ({v.relationType || '-'})</td>
                                        <td>{v.assemblyName}</td>
                                        <td>{v.district}</td>
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
        </div>
    )
}
