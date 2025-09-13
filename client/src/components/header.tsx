import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
// Import button component with explicit .tsx extension
import { Button } from "./ui/button.tsx";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm shadow-lg'
    }`}>
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2">
              <img 
                src="/assets/images/logo.png" 
                alt="SkyLabs Logo" 
                className="h-10 w-auto sm:h-12 transition-all duration-300 hover:opacity-90"
                width={160}
                height={48}
                loading="eager"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                SkyLabs
              </span>
            </a>
          </div>
          
          {/* Desktop Navigation */}
          <ul className="hidden md:flex space-x-8">
            {[
              { label: 'Home', id: 'home' },
              { label: 'Services', id: 'services' },
              { label: 'Portfolio', id: 'portfolio' },
              { label: 'About', id: 'about' },
              { label: 'Contact', id: 'contact' }
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => scrollToSection(item.id)}
                  className="hover:text-electric-cyan transition-colors duration-300 text-dark-gray"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-navy"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <ul className="space-y-4">
              {[
                { label: 'Home', id: 'home' },
                { label: 'Services', id: 'services' },
                { label: 'Portfolio', id: 'portfolio' },
                { label: 'About', id: 'about' },
                { label: 'Contact', id: 'contact' }
              ].map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className="block hover:text-electric-cyan transition-colors duration-300 text-dark-gray"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}