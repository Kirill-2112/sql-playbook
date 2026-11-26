import { Navigate, useParams } from 'react-router-dom'

/** Old keyword practice pages (/practice/:id) now live on the keyword's reference entry, which starts its drill. */
export function KeywordRedirect() {
  const { id = '' } = useParams()
  return <Navigate to={`/reference/${id}`} replace />
}
