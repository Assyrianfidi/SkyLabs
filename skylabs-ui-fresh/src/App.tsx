import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            SkyLabs UI
          </h1>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-6 h-6" />
            ) : (
              <Moon className="w-6 h-6" />
            )}
          </button>
        </header>

        <main className="max-w-4xl mx-auto">
          <section className="bg-card p-8 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-semibold mb-4">Welcome to SkyLabs UI</h2>
            <p className="text-muted-foreground mb-6">
              A modern UI component library built with React, TypeScript, and Tailwind CSS.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                Get Started
              </button>
              <button className="px-6 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                Documentation
              </button>
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-3">Feature One</h3>
              <p className="text-muted-foreground">
                Beautifully designed components that you can copy and paste into your apps.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-3">Feature Two</h3>
              <p className="text-muted-foreground">
                Accessible. Customizable. Open Source.
              </p>
            </div>
          </div>
        </main>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SkyLabs UI. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}

export default App
