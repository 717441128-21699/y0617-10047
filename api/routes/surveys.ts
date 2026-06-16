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
router.get('/:id/analytics', ctrl.getAnalytics);
router.get('/:id/trend', ctrl.getTrend);
router.get('/:id/cross-tab', ctrl.getCrossTab);
router.get('/:id/cross-tab/export', ctrl.exportCrossTab);
router.get('/:id/responses', ctrl.listResponses);
router.get('/:id/responses/export', ctrl.exportResponses);
router.post('/:id/responses/batch-tags', ctrl.batchUpdateTags);
router.post('/:id/responses/batch-notes', ctrl.batchUpdateNotes);
router.put('/responses/:responseId/tags', ctrl.updateResponseTags);
router.put('/responses/:responseId/note', ctrl.updateResponseNote);
router.get('/:id/segments', ctrl.listSegments);
router.post('/:id/segments', ctrl.createSegment);
router.put('/segments/:segmentId', ctrl.updateSegment);
router.delete('/segments/:segmentId', ctrl.deleteSegment);
router.get('/:id/views', ctrl.listSavedViews);
router.post('/:id/views', ctrl.createSavedView);
router.put('/views/:viewId', ctrl.updateSavedView);
router.post('/views/:viewId/clone', ctrl.cloneSavedView);
router.delete('/views/:viewId', ctrl.deleteSavedView);

export default router;
