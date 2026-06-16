import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Layout from '@/components/Layout';
import SurveyEditor from '@/pages/SurveyEditor';
import SurveySettings from '@/pages/SurveySettings';
import SurveyAnalyticsPage from '@/pages/SurveyAnalytics';
import SurveyResponses from '@/pages/SurveyResponses';
import SurveyShare from '@/pages/SurveyShare';
import SurveyAnswer from '@/pages/SurveyAnswer';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/survey/:id" element={<Layout />}>
          <Route index element={<SurveyEditor />} />
          <Route path="edit" element={<SurveyEditor />} />
          <Route path="settings" element={<SurveySettings />} />
          <Route path="analytics" element={<SurveyAnalyticsPage />} />
          <Route path="responses" element={<SurveyResponses />} />
          <Route path="share" element={<SurveyShare />} />
        </Route>

        <Route path="/s/:token" element={<SurveyAnswer />} />
        <Route path="/embed/:token" element={<SurveyAnswer embed />} />
      </Routes>
    </Router>
  );
}
