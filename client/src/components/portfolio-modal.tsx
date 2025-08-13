import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProjectDetails {
  fullDescription: string;
  technologies: string[];
  results: string[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  details: ProjectDetails;
}

interface PortfolioModalProps {
  project: Project | null;
  onClose: () => void;
}

export default function PortfolioModal({ project, onClose }: PortfolioModalProps) {
  if (!project) return null;

  return (
    <Dialog open={!!project} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold text-navy">
              {project.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <img
            src={project.image}
            alt={project.alt}
            className="w-full rounded-lg"
          />
          
          <p className="text-medium-gray">
            {project.details.fullDescription}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-navy mb-3">Technologies Used:</h4>
              <ul className="text-medium-gray space-y-1">
                {project.details.technologies.map((tech, index) => (
                  <li key={index}>• {tech}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-navy mb-3">Results:</h4>
              <ul className="text-medium-gray space-y-1">
                {project.details.results.map((result, index) => (
                  <li key={index}>• {result}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}