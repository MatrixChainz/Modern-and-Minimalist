import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import IPManagement from './pages/IPManagement'
import RoyaltyTracking from './pages/RoyaltyTracking'
import Stakeholders from './pages/Stakeholders'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <Layout>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ip-management" element={<IPManagement />} />
          <Route path="/royalty-tracking" element={<RoyaltyTracking />} />
          <Route path="/stakeholders" element={<Stakeholders />} />
        </Route>
      </Routes>
    </Layout>
  )
}

export default App
