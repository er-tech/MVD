import { createRoot } from 'react-dom/client'
import { App } from './app'
import { wailsBackend } from './backend'

const root = document.getElementById('app')
if (root === null) {
  throw new Error('index.html has no #app')
}
createRoot(root).render(<App backend={wailsBackend()} />)
