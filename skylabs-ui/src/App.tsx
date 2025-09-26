import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Button } from './components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui/card';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <div className="min-h-screen bg-background">
          <main className="container mx-auto py-8">
            <Card className="w-full max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>Welcome to SkyLabs</CardTitle>
                <CardDescription>Your modern React application with Vite and TypeScript</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>This is a starter template with:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Vite + React + TypeScript</li>
                    <li>Tailwind CSS with dark mode support</li>
                    <li>Shadcn UI components</li>
                    <li>React Router for navigation</li>
                    <li>Theme provider for light/dark mode</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-4">
                <Button variant="outline">Learn More</Button>
                <Button>Get Started</Button>
              </CardFooter>
            </Card>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
