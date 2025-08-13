import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertContactSchema, type InsertContact } from "@shared/schema";

export default function Contact() {
  const { toast } = useToast();
  
  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      const response = await apiRequest("POST", "/api/contact", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Message Sent!",
        description: data.message,
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContact) => {
    contactMutation.mutate(data);
  };

  return (
    <section id="contact" className="py-20 bg-light-gray">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-navy mb-4">Let's Build Something Amazing</h2>
          <p className="text-xl text-medium-gray">Ready to transform your digital presence? Get in touch for a free consultation.</p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card className="bg-white rounded-xl shadow-lg">
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-navy font-semibold">Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="border-gray-300 focus:ring-electric-cyan focus:border-electric-cyan"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-navy font-semibold">Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            className="border-gray-300 focus:ring-electric-cyan focus:border-electric-cyan"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-navy font-semibold">Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            {...field}
                            className="border-gray-300 focus:ring-electric-cyan focus:border-electric-cyan"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-navy font-semibold">Message *</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={5}
                            className="border-gray-300 focus:ring-electric-cyan focus:border-electric-cyan resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    disabled={contactMutation.isPending}
                    className="w-full bg-gradient-to-r from-tech-blue to-electric-cyan text-white font-semibold py-3 px-6 rounded-lg hover:from-tech-blue hover:to-cyan-500 transition-all duration-300 transform hover:scale-105"
                  >
                    {contactMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Contact Info */}
          <div className="space-y-8">
            <Card className="bg-white rounded-xl shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-navy mb-6">Get In Touch</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="bg-electric-cyan w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                      <Phone className="text-white w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy">Phone</p>
                      <p className="text-medium-gray">(778) 404-3413</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-electric-cyan w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                      <Mail className="text-white w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy">Email</p>
                      <p className="text-medium-gray">fidi.amazon@gmail.com</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-electric-cyan w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                      <MapPin className="text-white w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy">Location</p>
                      <p className="text-medium-gray">Surrey, BC, Canada</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Map */}
            <Card className="bg-white rounded-xl shadow-lg">
              <CardContent className="p-4">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d41965.89094085843!2d-122.8785304!3d49.1939582!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x5485d9b13e378e01%3A0xa4bf4ca6c29b7e0e!2sSurrey%2C%20BC%2C%20Canada!5e0!3m2!1sen!2sus!4v1640995200000!5m2!1sen!2sus"
                  width="100%" 
                  height="250" 
                  style={{ border: 0, borderRadius: '8px' }}
                  allowFullScreen
                  loading="lazy"
                  title="Surrey, BC Location"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
