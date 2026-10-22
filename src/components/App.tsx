import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { tokens } from '../theme/tokens'
import { GlobalStyle } from '../theme/GlobalStyle'
import { DatasetPage } from './DatasetPage'
import { ExercisePage } from './ExercisePage'
import { ExercisesPage } from './ExercisesPage'
import { HomePage } from './HomePage'
import { IndexLabPage } from './IndexLabPage'
import { Layout } from './Layout'
import { LearnPage } from './LearnPage'
import { LessonPage } from './LessonPage'
import { LicensesPage } from './LicensesPage'
import { DrillPage } from './DrillPage'
import { KeywordPage } from './KeywordPage'
import { PracticePage } from './PracticePage'
import { ProgressPage } from './ProgressPage'
import { ReviewPage } from './ReviewPage'
import { WelcomePage } from './WelcomePage'
import { ReferenceEntryPage } from './ReferenceEntryPage'
import { ReferencePage } from './ReferencePage'
import { SituationPage } from './SituationPage'

// HashRouter keeps deep links working on static hosting (GitHub Pages) without server rewrites.
export function App() {
  return (
    <ThemeProvider theme={tokens}>
      <GlobalStyle />
      <HashRouter>
        <Routes>
          {/* Lessons take the whole screen, without the sidebar or tabs. */}
          <Route path="learn/:lessonId" element={<LessonPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="welcome" element={<WelcomePage />} />
          <Route path="practice/:id/drill" element={<DrillPage />} />
          <Route element={<Layout />}>
            <Route index element={<LearnPage />} />
            <Route path="overview" element={<HomePage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="practice" element={<PracticePage />} />
            <Route path="practice/:id" element={<KeywordPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="exercises/:id" element={<ExercisePage />} />
            <Route path="datasets/:id" element={<DatasetPage />} />
            <Route path="situations/:slug" element={<SituationPage />} />
            <Route path="index-lab" element={<IndexLabPage />} />
            <Route path="reference" element={<ReferencePage />} />
            <Route path="reference/:id" element={<ReferenceEntryPage />} />
            <Route path="licenses" element={<LicensesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
