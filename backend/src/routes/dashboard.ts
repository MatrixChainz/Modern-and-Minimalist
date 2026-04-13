import { Router } from 'express'
import { DashboardController } from '../controllers/dashboardController'

const router = Router()
const dashboardController = new DashboardController()

router.get('/stats', dashboardController.getStats)

export { router as dashboardRoutes }
