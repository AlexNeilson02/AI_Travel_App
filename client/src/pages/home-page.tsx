import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Nav from "@/components/Nav";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

type Destination = {
  name: string;
  image: string;
  description?: string;
  count?: number;
};

// Default destinations as fallback
const defaultDestinations = [
  {
    name: "Kyoto, Japan",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000",
    description: "Ancient temples and traditional gardens"
  },
  {
    name: "Santorini, Greece",
    image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?q=80&w=1000",
    description: "Stunning sunsets and white-washed architecture"
  },
  {
    name: "Maui, Hawaii",
    image: "https://images.unsplash.com/photo-1542259009477-d625272157b7?q=80&w=1000",
    description: "Tropical paradise with pristine beaches"
  },
  {
    name: "Swiss Alps",
    image: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1000",
    description: "Breathtaking mountain landscapes"
  },
  {
    name: "Marrakech, Morocco",
    image: "https://images.unsplash.com/photo-1597211684565-dca64d72c52f?q=80&w=1000",
    description: "Vibrant markets and rich culture"
  },
  {
    name: "Bali, Indonesia",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=1000",
    description: "Tropical temples and rice terraces"
  }
];

const testimonials = [
  {
    name: "Franccess Wool",
    text: "Don't just take our word for it—see what fellow travelers are saying!"
  },
  {
    name: "Franccess Wool",
    text: "Don't just take our word for it—see what fellow travelers are saying!"
  },
  {
    name: "Franccess Wool",
    text: "Don't just take our word for it—see what fellow travelers are saying!"
  }
];

export default function HomePage() {
  const [popularDestinations, setPopularDestinations] = useState<Destination[]>(defaultDestinations);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPopularDestinations() {
      try {
        const response = await fetch('/api/popular-destinations');
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setPopularDestinations(data);
          }
        }
      } catch (error) {
        console.error('Error fetching popular destinations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPopularDestinations();
  }, []);

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
              <Button size="lg" className="bg-[#FF5A5F] hover:bg-[#FF4449] rounded-full">
                Start Planning
              </Button>
            </Link>
          </div>
        </div>

        {/* Popular Destinations */}
        <section className="mb-12 bg-neutral-100 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-6">Popular Destinations</h2>
          <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
            {popularDestinations.map((destination) => (
              <div 
                key={destination.name} 
                className="flex-none w-64 snap-start"
              >
                <div className="aspect-[4/3] relative bg-neutral-200 rounded-md overflow-hidden mb-2">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <h3 className="text-center font-medium">{destination.name}</h3>
                {destination.description && (
                  <p className="text-sm text-center text-gray-600">{destination.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="mb-12">
          <h2 className="text-xl font-medium mb-4">
            Don't just take our word for it—see what fellow travelers are saying!
          </h2>
          <div className="space-y-4">
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