import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Nav from "@/components/Nav";
import { Star } from "lucide-react";

// Fixed destinations with high-quality images
const destinations = [
  {
    title: "Paris, France",
    description: "City of Lights & Romance",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2940",
  },
  {
    title: "Kyoto, Japan",
    description: "Ancient Cultural Capital",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2940",
  },
  {
    title: "Santorini, Greece",
    description: "Mediterranean Paradise",
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?q=80&w=2940",
  },
  {
    title: "Machu Picchu, Peru",
    description: "Lost City of the Incas",
    image: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=2940",
  },
];

const testimonials = [
  {
    name: "Sarah Thompson",
    text: "This AI travel planner made organizing my dream vacation so effortless. Highly recommended!"
  },
  {
    name: "James Wilson",
    text: "The personalized recommendations were spot-on. Saved me hours of research!"
  },
  {
    name: "Emma Davis",
    text: "From itinerary planning to local insights, this platform has everything you need!"
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] mb-8 mt-4 rounded-lg overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1" 
            alt="Travel Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-6 right-6">
            <Link href="/plan">
              <Button size="lg" className="rounded-full text-white">
                Start Planning
              </Button>
            </Link>
          </div>
        </div>

        {/* Popular Destinations */}
        <section className="mb-12 bg-neutral-100 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-6">Popular Destinations</h2>
          <div className="space-y-4 lg:space-y-0">
            {/* Mobile Slider */}
            <div className="flex overflow-x-auto snap-x snap-mandatory lg:hidden -mx-6 px-6 pb-6 -mb-6 gap-4">
              {destinations.map((destination) => (
                <div 
                  key={destination.title}
                  className="flex-none w-[280px] snap-center"
                >
                  <div className="aspect-[4/3] relative bg-neutral-200 rounded-lg overflow-hidden">
                    <img
                      src={destination.image}
                      alt={destination.title}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-end p-4">
                      <div className="text-white">
                        <h3 className="font-semibold text-lg">{destination.title}</h3>
                        <p className="text-sm text-white/90">{destination.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Grid */}
            <div className="hidden lg:grid grid-cols-4 gap-4">
              {destinations.map((destination) => (
                <div 
                  key={destination.title}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[4/3] relative bg-neutral-200 rounded-lg overflow-hidden">
                    <img
                      src={destination.image}
                      alt={destination.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-end p-4">
                      <div className="text-white">
                        <h3 className="font-semibold text-lg">{destination.title}</h3>
                        <p className="text-sm text-white/90">{destination.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-4">What Our Travelers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold">{testimonial.name}</h3>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{testimonial.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}