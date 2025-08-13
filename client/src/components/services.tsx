import { Globe, Smartphone, Settings, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    icon: Globe,
    title: "Web Development",
    description: "Custom, responsive, and SEO-friendly websites that drive results and engage your audience.",
  },
  {
    icon: Smartphone,
    title: "Mobile App Development",
    description: "Android & iOS app creation from concept to launch, delivering exceptional user experiences.",
  },
  {
    icon: Settings,
    title: "Custom Software Solutions",
    description: "Tailored tools and platforms designed specifically for your business processes and goals.",
  },
  {
    icon: ShoppingCart,
    title: "E-commerce Development",
    description: "Scalable online stores with secure payment integration and inventory management systems.",
  },
];

export default function Services() {
  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="services" className="py-20 bg-light-gray">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-navy mb-4">Our Expertise</h2>
          <p className="text-xl text-medium-gray">Comprehensive digital solutions for your business needs</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group">
                <CardContent className="p-8">
                  <div className="bg-gradient-to-r from-tech-blue to-electric-cyan w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="text-white text-2xl w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-navy">{service.title}</h3>
                  <p className="text-medium-gray mb-6">{service.description}</p>
                  <button
                    onClick={scrollToContact}
                    className="text-electric-cyan font-semibold hover:underline"
                  >
                    Learn More →
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
