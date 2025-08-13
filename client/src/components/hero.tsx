import { Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="hero-bg tech-pattern min-h-screen flex items-center pt-20">
      <div className="container mx-auto px-6">
        <div className="text-center text-white">
          <div className="animate-float mb-8">
            <div className="inline-block bg-white/10 backdrop-blur-sm rounded-full p-6 mb-6">
              <Laptop className="text-6xl text-electric-cyan w-16 h-16" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Your Vision, Our Code
          </h1>
          <h2 className="text-2xl md:text-3xl font-light mb-6 animate-fade-in">
            Building Digital Solutions That Work
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-white/90 animate-slide-up">
            Expert website, app, and software development serving the Lower Mainland
          </p>
          <Button
            onClick={scrollToContact}
            className="inline-block bg-electric-cyan hover:bg-cyan-500 text-white font-semibold px-8 py-4 rounded-full text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl animate-slide-up"
          >
            Get a Free Quote
          </Button>
        </div>
      </div>
    </section>
  );
}
