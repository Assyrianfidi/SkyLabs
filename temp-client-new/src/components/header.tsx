import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}

export default function Header({ isMenuOpen, setIsMenuOpen }: HeaderProps) {
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
      isScrolled ? 'bg-white/95 shadow-md' : 'bg-white/90'
    }`}>
      <nav className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center">
              <img 
                src="/assets/images/logo.png" 
                alt="SkyLabs Logo" 
                className="h-10 w-auto"
                width={160}
                height={48}
                loading="eager"
              />
              <span className="ml-2 text-xl font-bold text-primary">
                SkyLabs
              </span>
            </a>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-8">
              <a href="#home" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                Home
              </a>
              <a href="#about" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                About
              </a>
              <a href="#services" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                Services
              </a>
              <a href="#portfolio" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                Portfolio
              </a>
              <a href="#contact" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                Contact
              </a>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen as unknown as boolean}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a
                href="#home"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('home');
                  setIsMenuOpen(false);
                }}
              >
                Home
              </a>
              <a
                href="#about"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('about');
                  setIsMenuOpen(false);
                }}
              >
                About
              </a>
              <a
                href="#services"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('services');
                  setIsMenuOpen(false);
                }}
              >
                Services
              </a>
              <a
                href="#portfolio"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('portfolio');
                  setIsMenuOpen(false);
                }}
              >
                Portfolio
              </a>
              <a
                href="#contact"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('contact');
                  setIsMenuOpen(false);
                }}
              >
                Contact
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}