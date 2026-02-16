import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Grievances from './pages/Grievances'
import Suggestions from './pages/Suggestions'
import Volunteers from './pages/Volunteers'
import Subscribers from './pages/Subscribers'
import Voters from './pages/Voters'
import StatusLookup from './pages/StatusLookup'

export default function App() {
  return (
    <Routes>
      <Route path="/chat" element={<Chat />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/grievances" element={<Grievances />} />
        <Route path="/suggestions" element={<Suggestions />} />
        <Route path="/volunteers" element={<Volunteers />} />
        <Route path="/subscribers" element={<Subscribers />} />
        <Route path="/voters" element={<Voters />} />
        <Route path="/status" element={<StatusLookup />} />
      </Route>
    </Routes>
  )
}
