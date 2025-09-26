import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import PortfolioModal from "./portfolio-modal";

const portfolioItems = [
  {
    id: "modal1",
    title: "Vancouver Retail Solutions",
    description: "Complete e-commerce platform with inventory management, resulting in 300% increase in online sales.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    alt: "E-commerce dashboard analytics",
    details: {
      fullDescription: "Comprehensive e-commerce platform built with modern technologies including React, Node.js, and MongoDB. Features include inventory management, customer analytics, payment processing, and mobile-responsive design.",
      technologies: [
        "React & Redux",
        "Node.js & Express",
        "MongoDB",
        "Stripe Integration"
      ],
      results: [
        "300% increase in online sales",
        "50% reduction in cart abandonment",
        "Improved user experience",
        "Automated inventory management"
      ]
    }
  },
  {
    id: "modal2",
    title: "HealthTracker Mobile App",
    description: "iOS and Android fitness tracking app with 50,000+ downloads and 4.8-star rating.",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    alt: "Mobile app interface design",
    details: {
      fullDescription: "Cross-platform mobile application for health and fitness tracking with real-time data synchronization and social features.",
      technologies: [
        "React Native",
        "Firebase",
        "Redux Toolkit",
        "Health APIs"
      ],
      results: [
        "50,000+ downloads",
        "4.8-star rating",
        "Real-time sync",
        "Social features"
      ]
    }
  },
  {
    id: "modal3",
    title: "Burnaby Tech Consulting",
    description: "Professional corporate website with integrated CRM, improving lead generation by 250%.",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    alt: "Corporate website design",
    details: {
      fullDescription: "Professional corporate website with integrated CRM system, improving lead generation and client management processes.",
      technologies: [
        "Next.js",
        "Tailwind CSS",
        "PostgreSQL",
        "CRM Integration"
      ],
      results: [
        "250% increase in leads",
        "Improved client management",
        "Modern design",
        "SEO optimized"
      ]
    }
  },
  {
    id: "modal4",
    title: "Richmond Manufacturing CRM",
    description: "Custom inventory and client management system, reducing operational costs by 40%.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    alt: "Software dashboard analytics",
    details: {
      fullDescription: "Custom CRM solution for manufacturing operations with inventory tracking, client management, and reporting features.",
      technologies: [
        "Vue.js",
        "Python Django",
        "PostgreSQL",
        "Chart.js"
      ],
      results: [
        "40% cost reduction",
        "Automated reporting",
        "Inventory tracking",
        "Client management"
      ]
    }
  },
  {
    id: "modal5",
    title: "Surrey Dining App",
    description: "Food delivery platform connecting 200+ local restaurants with integrated payment processing.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    alt: "Restaurant ordering app",
    details: {
      fullDescription: "Food delivery platform connecting local restaurants with customers, featuring real-time tracking and payment processing.",
      technologies: [
        "React Native",
        "Node.js",
        "Socket.io",
        "Stripe API"
      ],
      results: [
        "200+ restaurants",
        "Real-time tracking",
        "Payment processing",
        "Order management"
      ]
    }
  },
  {
    id: "modal6",
    title: "EdTech Learning Platform",
    description: "Interactive online learning system serving 10,000+ students with progress tracking.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=500",
    alt: "Educational learning platform",
    details: {
      fullDescription: "Interactive online learning platform with course management, progress tracking, and collaborative features for students and educators.",
      technologies: [
        "React",
        "Express.js",
        "MongoDB",
        "Video APIs"
      ],
      results: [
        "10,000+ students",
        "Progress tracking",
        "Interactive features",
        "Course management"
      ]
    }
  }
];

export default function Portfolio() {
  const [selectedProject, setSelectedProject] = useState<typeof portfolioItems[0] | null>(null);

  return (
    <section id="portfolio" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-navy mb-4">Our Work in Action</h2>
          <p className="text-xl text-medium-gray">Showcasing successful projects and client transformations</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {portfolioItems.map((item) => (
            <div
              key={item.id}
              className="group cursor-pointer"
              onClick={() => setSelectedProject(item)}
            >
              <Card className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.alt}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-3 text-navy">{item.title}</h3>
                  <p className="text-medium-gray mb-4">{item.description}</p>
                  <div className="flex items-center text-electric-cyan">
                    <span className="font-semibold">View Project</span>
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <PortfolioModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </section>
  );
}
