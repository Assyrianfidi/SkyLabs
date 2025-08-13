export default function About() {
  return (
    <section id="about" className="py-20 gradient-bg">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <h2 className="text-4xl font-bold mb-6">Who We Are</h2>
            <p className="text-xl mb-6 text-white/90">
              Guildford Programmer Developer is your trusted technology partner, delivering innovative solutions for businesses across the Lower Mainland. We pride ourselves on coding excellence, creative design, and results-driven projects.
            </p>
            <p className="text-lg text-white/80 mb-8">
              Our team combines technical expertise with creative problem-solving to build digital solutions that not only meet your current needs but scale with your future growth. From startups to established enterprises, we've helped businesses transform their digital presence.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-electric-cyan mb-2">100+</div>
                <div className="text-white/80">Projects Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-electric-cyan mb-2">5+</div>
                <div className="text-white/80">Years Experience</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
              alt="Modern development workspace"
              className="rounded-xl shadow-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-tech-blue/20 to-electric-cyan/20 rounded-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}