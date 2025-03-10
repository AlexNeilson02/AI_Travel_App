import { Nav } from "@/components/ui/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, Calendar, DollarSign, Map } from "lucide-react";
import { Link } from "wouter";

const featuredDestinations = [
  {
    name: "Mountain Retreat",
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1",
    description: "Explore serene mountain landscapes",
  },
  {
    name: "Beach Paradise",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
    description: "Relax on pristine beaches",
  },
  {
    name: "Cultural Journey",
    image: "https://images.unsplash.com/photo-1522199710521-72d69614c702",
    description: "Immerse yourself in local traditions",
  },
  {
    name: "Urban Adventure",
    image: "https://images.unsplash.com/photo-1496950866446-3253e1470e8e",
    description: "Discover vibrant city life",
  },
];

const features = [
  {
    title: "AI Trip Planning",
    description: "Get personalized travel recommendations",
    icon: Plane,
  },
  {
    title: "Smart Scheduling",
    description: "Optimized itineraries for your time",
    icon: Calendar,
  },
  {
    title: "Budget Tracking",
    description: "Keep your expenses in check",
    icon: DollarSign,
  },
  {
    title: "Local Insights",
    description: "Discover hidden gems and local favorites",
    icon: Map,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Plan Your Perfect Trip with AI
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Let our AI help you create personalized travel experiences tailored to your preferences
          </p>
          <Link href="/plan">
            <Button size="lg" className="bg-[#FF5A5F] hover:bg-[#FF4449]">
              Start Planning
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="pt-6">
                <feature.icon className="h-10 w-10 text-[#FF5A5F] mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section>
          <h2 className="text-2xl font-bold mb-6">Featured Destinations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDestinations.map((destination) => (
              <Card key={destination.name} className="overflow-hidden">
                <div className="aspect-[4/3] relative">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{destination.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {destination.description}
                  </p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
