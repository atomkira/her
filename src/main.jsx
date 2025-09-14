import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ServerWakeGate from './components/ServerWakeGate.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ServerWakeGate>
      <App />
    </ServerWakeGate>
  </React.StrictMode>,
)
