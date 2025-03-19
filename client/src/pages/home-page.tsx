import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Nav from "@/components/Nav";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

type Destination = {
  name: string;
  image: string;
};

// Default destinations
const defaultDestinations = [
  {
    name: "Paris, France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000",
  },
  {
    name: "Maldives",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=1000",
  },
  {
    name: "New York City, USA",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1000",
  },
  {
    name: "Tokyo, Japan",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1000",
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
            {popularDestinations.map((destination, index) => (
              <div 
                key={destination.name + index} 
                className="flex-none w-64 snap-start"
              >
                <div className="aspect-[4/3] relative bg-neutral-200 rounded-md overflow-hidden mb-2">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.currentTarget.src = "/a340adbb-a64e-42f7-aa3a-6ce1afa0c057.png"
                    }}
                  />
                </div>
                <h3 className="text-center font-medium text-lg">{destination.name}</h3>
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