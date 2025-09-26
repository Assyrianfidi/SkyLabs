import { useState } from 'react';
import Header from './components/header';
import Hero from './components/hero';
import About from './components/about';
import Services from './components/services';
import Portfolio from './components/portfolio';
import Contact from './components/contact';
import Footer from './components/footer';
import { ThemeToggle } from './components/theme-toggle';
import './index.css';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Header isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen}>
        <ThemeToggle />
      </Header>
      <main className="flex-grow">
        <Hero />
        <About />
        <Services />
        <Portfolio />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;
