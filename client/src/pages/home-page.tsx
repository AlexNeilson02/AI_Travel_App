import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

type Destination = {
  name: string;
  image: string;
  description?: string;
};

const defaultDestinations = [
  {
    name: "Greece",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1000",
    description: "Ancient ruins and stunning islands"
  },
  {
    name: "Italy",
    image: "https://images.unsplash.com/photo-1534445867742-43195f401b6c?q=80&w=1000",
    description: "Historic cities and delicious cuisine"
  },
  {
    name: "Japan",
    image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=1000",
    description: "Blend of tradition and technology"
  }
];

export default function HomePage() {
  const [popularDestinations, setPopularDestinations] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPopularDestinations() {
      try {
        const response = await fetch('/api/popular-destinations');
        if (response.ok) {
          const data = await response.json();
          setPopularDestinations(data);
        }
      } catch (error) {
        console.error('Error fetching popular destinations:', error);
      }
    }

    fetchPopularDestinations();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-12 bg-neutral-100 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-6">Popular Destinations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularDestinations.map((destination, index) => (
              <Link key={destination} href={`/plan?destination=${encodeURIComponent(destination)}`}>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <div className="aspect-[4/3] relative bg-neutral-200 rounded-t-md overflow-hidden">
                    <img
                      src={defaultDestinations[index % defaultDestinations.length].image}
                      alt={destination}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-lg">{destination}</h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}