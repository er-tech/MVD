import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/index.ts'

const root = document.getElementById('app')
if (root === null) {
  throw new Error('index.html has no #app')
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
