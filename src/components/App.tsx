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
import { SituationPage } from './SituationPage'

// HashRouter keeps deep links working on static hosting (GitHub Pages) without server rewrites.
export function App() {
  return (
    <ThemeProvider theme={tokens}>
      <GlobalStyle />
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="exercises/:id" element={<ExercisePage />} />
            <Route path="datasets/:id" element={<DatasetPage />} />
            <Route path="situations/:slug" element={<SituationPage />} />
            <Route path="index-lab" element={<IndexLabPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}
