import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import IPManagement from './pages/IPManagement'
import IPAssetDetail from './pages/IPAssetDetail'
import RoyaltyTracking from './pages/RoyaltyTracking'
import Stakeholders from './pages/Stakeholders'
import Layout from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ip-management" element={<IPManagement />} />
        <Route path="/ip-management/:id" element={<IPAssetDetail />} />
        <Route path="/royalty-tracking" element={<RoyaltyTracking />} />
        <Route path="/stakeholders" element={<Stakeholders />} />
      </Routes>
    </Layout>
  )
}

export default App
