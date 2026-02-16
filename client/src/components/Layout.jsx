import { NavLink, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { apiGet } from '../api'
import {
    LayoutDashboard, AlertCircle, Lightbulb, Heart, Bell,
    Database, Search, MessageCircle, Menu, X
} from 'lucide-react'
import './Layout.css'

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [counts, setCounts] = useState({ openIssues: 0, pendingSuggestions: 0, pendingVolunteers: 0 })

    useEffect(() => {
        apiGet('/admin/dashboard').then(res => {
            if (res.success) {
                setCounts({
                    openIssues: res.data.grievances.open,
                    pendingSuggestions: res.data.suggestions.pending,
                    pendingVolunteers: res.data.volunteers.pending
                })
            }
        }).catch(() => { })
    }, [])

    return (
        <div className="layout">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="logo-icon">TVK</div>
                    <div className="logo-text">
                        <h1>TVK Admin</h1>
                        <span>Kavundampalayam</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={18} /><span>Dashboard</span>
                    </NavLink>

                    <NavLink to="/grievances" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <AlertCircle size={18} /><span>Issues</span>
                        {counts.openIssues > 0 && <span className="badge red">{counts.openIssues}</span>}
                    </NavLink>

                    <NavLink to="/suggestions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Lightbulb size={18} /><span>Suggestions</span>
                        {counts.pendingSuggestions > 0 && <span className="badge">{counts.pendingSuggestions}</span>}
                    </NavLink>

                    <NavLink to="/volunteers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Heart size={18} /><span>Volunteers</span>
                        {counts.pendingVolunteers > 0 && <span className="badge">{counts.pendingVolunteers}</span>}
                    </NavLink>

                    <NavLink to="/subscribers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Bell size={18} /><span>Subscribers</span>
                    </NavLink>

                    <NavLink to="/voters" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Database size={18} /><span>Voter DB</span>
                    </NavLink>

                    <NavLink to="/status" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Search size={18} /><span>Status Lookup</span>
                    </NavLink>

                    <div className="nav-divider" />

                    <NavLink to="/chat" className="nav-link chat-link">
                        <MessageCircle size={18} /><span>Chat Simulator</span>
                        <span className="badge green">Live</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="connection-status">
                        <div className="status-dot" /><span>System Online</span>
                    </div>
                </div>
            </aside>

            <main className="main-content"><Outlet /></main>

            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        </div>
    )
}
