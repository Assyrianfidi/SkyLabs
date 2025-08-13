import { Github, Linkedin, Facebook, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="gradient-bg py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-white mb-6 md:mb-0">
            <p>&copy; 2025 Guildford Programmer Developer. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <a
              href="#"
              className="text-white hover:text-electric-cyan transition-colors duration-300"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-6 h-6" />
            </a>
            <a
              href="#"
              className="text-white hover:text-electric-cyan transition-colors duration-300"
              aria-label="GitHub"
            >
              <Github className="w-6 h-6" />
            </a>
            <a
              href="#"
              className="text-white hover:text-electric-cyan transition-colors duration-300"
              aria-label="Facebook"
            >
              <Facebook className="w-6 h-6" />
            </a>
            <a
              href="#"
              className="text-white hover:text-electric-cyan transition-colors duration-300"
              aria-label="Instagram"
            >
              <Instagram className="w-6 h-6" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}