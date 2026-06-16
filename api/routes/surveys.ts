import { Router } from 'express';
import * as ctrl from '../controllers/surveyController.js';

const router = Router();

router.get('/', ctrl.listSurveys);
router.post('/', ctrl.createSurvey);
router.get('/token/:token', ctrl.getSurveyByToken);
router.post('/token/:token/verify', ctrl.verifyPassword);
router.post('/token/:token/responses', ctrl.submitResponse);
router.get('/:id', ctrl.getSurvey);
router.put('/:id', ctrl.updateSurvey);
router.delete('/:id', ctrl.deleteSurvey);
router.post('/:id/publish', ctrl.publishSurvey);
router.post('/:id/close', ctrl.closeSurvey);
router.get('/:id/responses', ctrl.listResponses);
router.get('/:id/responses/export', ctrl.exportResponses);
router.get('/:id/analytics', ctrl.getAnalytics);

export default router;
