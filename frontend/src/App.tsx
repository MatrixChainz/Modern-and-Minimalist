import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import IPManagement from './pages/IPManagement'
import RoyaltyTracking from './pages/RoyaltyTracking'
import Stakeholders from './pages/Stakeholders'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ip-management" element={<IPManagement />} />
            <Route path="/royalty-tracking" element={<RoyaltyTracking />} />
            <Route path="/stakeholders" element={<Stakeholders />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default App
