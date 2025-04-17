import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Send, 
  Calendar as CalendarIcon, 
  Users, 
  DollarSign, 
  MapPin, 
  Home, 
  Activity, 
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface TripDetails {
  destination: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  numberOfPeople: number;
  accommodationType: string[];
  activityTypes: string[];
  activityFrequency: string;
  confirmed: boolean;
}

export function PremiumTripPlanner() {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [tripDetails, setTripDetails] = useState<TripDetails>({
    destination: '',
    startDate: null,
    endDate: null,
    budget: 0,
    numberOfPeople: 1,
    accommodationType: [],
    activityTypes: [],
    activityFrequency: 'moderate',
    confirmed: false
  });
  const [collectedDetails, setCollectedDetails] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showRetryGeneration, setShowRetryGeneration] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  // Initialize conversation when component mounts and create demo plan for UI demonstration
  useEffect(() => {
    setMessages([
      {
        role: 'system',
        content: 'Welcome to Juno AI Travel Planner! I\'m here to help you plan your perfect trip. Let\'s build your itinerary step by step through conversation.',
        timestamp: new Date()
      },
      {
        role: 'assistant',
        content: 'Hi there! To start planning your perfect trip, I\'ll need to ask you a few questions one by one. First, where would you like to travel to?',
        timestamp: new Date()
      }
    ]);

    // Create a demo plan for UI visualization purposes
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);
    const lastDay = new Date(today);
    lastDay.setDate(today.getDate() + 3);

    // Update trip details with demo data
    setTripDetails({
      destination: 'Washington D.C.',
      startDate: today,
      endDate: lastDay,
      budget: 500,
      numberOfPeople: 2,
      accommodationType: ['hotel'],
      activityTypes: ['cultural', 'outdoor', 'adventure'],
      activityFrequency: 'relaxed',
      confirmed: true
    });
    
    // Add these to collected details
    setCollectedDetails(['destination', 'dates', 'budget', 'people', 'accommodation', 'activities', 'frequency']);

    // Set demo generated plan
    const demoPlan = {
      destination: "Washington D.C.",
      days: [
        {
          date: format(today, "MMM dd, yyyy"),
          dayOfWeek: format(today, "EEEE"),
          activities: {
            timeSlots: [
              {
                time: "09:30",
                activity: "Visit to National Mall and Memorial Parks",
                location: "900 Ohio Dr SW, Washington, DC 20024, United States",
                duration: "2.5 hours",
                notes: "Don't miss the Lincoln Memorial and Washington Monument",
                isEdited: false
              },
              {
                time: "12:30",
                activity: "Lunch at Founding Farmers",
                location: "1924 Pennsylvania Ave NW, Washington, DC 20006, United States",
                duration: "1 hour",
                notes: "Popular farm-to-table restaurant with local ingredients",
                isEdited: false
              },
              {
                time: "14:00",
                activity: "Tour of U.S. Capitol",
                location: "First St SE, Washington, DC 20004, United States",
                duration: "2 hours",
                notes: "Book the tour in advance for best experience",
                isEdited: false
              },
              {
                time: "16:30",
                activity: "Stroll through Georgetown",
                location: "Georgetown, Washington, DC, USA",
                duration: "1.5 hours",
                notes: "Historic neighborhood with shopping and dining",
                isEdited: false
              }
            ]
          },
          aiSuggestions: {
            weatherContext: {
              description: "Mainly clear",
              temperature: 67,
              humidity: 40,
              wind_speed: 5,
              precipitation_probability: 10,
              is_suitable_for_outdoor: true
            },
            alternativeActivities: []
          }
        },
        {
          date: format(tomorrow, "MMM dd, yyyy"),
          dayOfWeek: format(tomorrow, "EEEE"),
          activities: {
            timeSlots: [
              {
                time: "09:00",
                activity: "Smithsonian National Museum of Natural History",
                location: "10th St. & Constitution Ave. NW, Washington, DC 20560",
                duration: "3 hours",
                notes: "Free admission. Check out the Hope Diamond and dinosaur exhibits.",
                isEdited: false
              },
              {
                time: "12:30",
                activity: "Lunch at District Taco",
                location: "1309 F St NW, Washington, DC 20004",
                duration: "1 hour",
                notes: "Casual Mexican food",
                isEdited: false
              },
              {
                time: "14:00",
                activity: "Visit to National Air and Space Museum",
                location: "600 Independence Ave SW, Washington, DC 20560",
                duration: "2.5 hours",
                notes: "Don't miss the Wright Brothers exhibit",
                isEdited: false
              },
              {
                time: "17:00",
                activity: "Washington Monument Sunset View",
                location: "2 15th St NW, Washington, DC 20024",
                duration: "1 hour",
                notes: "Reserve tickets in advance",
                isEdited: false
              }
            ]
          },
          aiSuggestions: {
            weatherContext: {
              description: "Partly cloudy",
              temperature: 70,
              humidity: 45,
              wind_speed: 6,
              precipitation_probability: 5,
              is_suitable_for_outdoor: true
            },
            alternativeActivities: []
          }
        },
        {
          date: format(dayAfterTomorrow, "MMM dd, yyyy"),
          dayOfWeek: format(dayAfterTomorrow, "EEEE"),
          activities: {
            timeSlots: [
              {
                time: "09:30",
                activity: "Arlington National Cemetery Tour",
                location: "Arlington, VA 22211",
                duration: "2 hours",
                notes: "Pay respects at the Tomb of the Unknown Soldier",
                isEdited: false
              },
              {
                time: "12:00",
                activity: "Lunch at Ben's Chili Bowl",
                location: "1213 U St NW, Washington, DC 20009",
                duration: "1 hour",
                notes: "Historic DC restaurant famous for half-smokes",
                isEdited: false
              },
              {
                time: "13:30",
                activity: "National Gallery of Art",
                location: "Constitution Ave. NW, Washington, DC 20565",
                duration: "2.5 hours",
                notes: "World-class art collection",
                isEdited: false
              },
              {
                time: "16:30",
                activity: "Tidal Basin Walk",
                location: "Tidal Basin, Washington, DC",
                duration: "1.5 hours",
                notes: "Beautiful views of Jefferson Memorial",
                isEdited: false
              }
            ]
          },
          aiSuggestions: {
            weatherContext: {
              description: "Sunny",
              temperature: 72,
              humidity: 42,
              wind_speed: 4,
              precipitation_probability: 0,
              is_suitable_for_outdoor: true
            },
            alternativeActivities: []
          }
        },
        {
          date: format(lastDay, "MMM dd, yyyy"),
          dayOfWeek: format(lastDay, "EEEE"),
          activities: {
            timeSlots: [
              {
                time: "09:00",
                activity: "White House Photo Stop",
                location: "1600 Pennsylvania Avenue NW, Washington, DC 20500",
                duration: "1 hour",
                notes: "Great photo opportunity",
                isEdited: false
              },
              {
                time: "10:30",
                activity: "United States Holocaust Memorial Museum",
                location: "100 Raoul Wallenberg Pl SW, Washington, DC 20024",
                duration: "2 hours",
                notes: "Reserve timed entry passes in advance",
                isEdited: false
              },
              {
                time: "13:00",
                activity: "Lunch at Old Ebbitt Grill",
                location: "675 15th St NW, Washington, DC 20005",
                duration: "1.5 hours",
                notes: "Historic restaurant near the White House",
                isEdited: false
              },
              {
                time: "15:00",
                activity: "National Archives Museum",
                location: "701 Constitution Ave NW, Washington, DC 20408",
                duration: "1.5 hours",
                notes: "See the original Declaration of Independence",
                isEdited: false
              }
            ]
          },
          aiSuggestions: {
            weatherContext: {
              description: "Clear sky",
              temperature: 69,
              humidity: 38,
              wind_speed: 5,
              precipitation_probability: 0,
              is_suitable_for_outdoor: true
            },
            alternativeActivities: []
          }
        }
      ]
    };
    
    setGeneratedPlan(demoPlan);
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: async (plan: any) => {
      // The rest of the mutation function remains unchanged
      if (!tripDetails.destination || !tripDetails.startDate || !tripDetails.endDate) {
        throw new Error('Missing required trip details');
      }

      // Format the itinerary
      const formattedItinerary = {
        days: plan.days.map((day: any) => {
          return {
            date: format(new Date(day.date), "yyyy-MM-dd"),
            activities: {
              timeSlots: day.activities.timeSlots.map((activity: any) => ({
                time: activity.time || "00:00",
                activity: activity.activity || activity.name,
                location: activity.location || "TBD",
                duration: activity.duration || "2 hours",
                notes: activity.notes || "",
                isEdited: false,
                url: activity.url,
              })),
            },
            aiSuggestions: {
              reasoning: "AI-generated suggestion",
              weatherContext: day.aiSuggestions?.weatherContext
                ? {
                    description: day.aiSuggestions.weatherContext.description,
                    temperature: day.aiSuggestions.weatherContext.temperature,
                    humidity: day.aiSuggestions.weatherContext.humidity || 0,
                    wind_speed: day.aiSuggestions.weatherContext.wind_speed || 0,
                    precipitation_probability:
                      day.aiSuggestions.weatherContext.precipitation_probability || 0,
                    is_suitable_for_outdoor:
                      day.aiSuggestions.weatherContext.is_suitable_for_outdoor || true,
                  }
                : undefined,
              alternativeActivities: day.aiSuggestions?.alternativeActivities || [],
            },
            userFeedback: "",
            isFinalized: false,
          };
        }),
      };

      // Construct the trip data
      const tripData = {
        title: `Trip to ${tripDetails.destination}`,
        destination: tripDetails.destination,
        startDate: tripDetails.startDate.toISOString(),
        endDate: tripDetails.endDate.toISOString(),
        budget: tripDetails.budget,
        preferences: {
          accommodationType: tripDetails.accommodationType,
          activityTypes: tripDetails.activityTypes,
          activityFrequency: tripDetails.activityFrequency,
          mustSeeAttractions: [],
          dietaryRestrictions: [],
          transportationPreferences: [],
        },
        itinerary: formattedItinerary,
      };

      const tripRes = await apiRequest("POST", "/api/trips", tripData);
      return await tripRes.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Trip created successfully!",
      });
      
      // Clear states
      setGeneratedPlan(null);
      setTripDetails({
        destination: '',
        startDate: null,
        endDate: null,
        budget: 0,
        numberOfPeople: 1,
        accommodationType: [],
        activityTypes: [],
        activityFrequency: 'moderate',
        confirmed: false
      });
      setCollectedDetails([]);
      
      // Add a success message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Your trip has been created successfully! You can view it in your trips dashboard.',
        timestamp: new Date()
      }]);
      
      // Invalidate queries to refresh the trips list
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      
      // Redirect to the trip dashboard after a delay
      setTimeout(() => {
        navigate('/trips');
      }, 2000);
    },
    onError: (error: any) => {
      // Error handling remains unchanged
      // Handle authentication errors
      if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        toast({
          title: "Login Required",
          description: "Please log in or register to save your trip",
          variant: "default",
        });
        
        // Redirect to auth page after a delay
        setTimeout(() => {
          navigate('/auth');
        }, 1500);
        return;
      }
      
      // Handle database connection errors
      if (error.message?.includes("DB_CONNECTION_ERROR") || 
          error.message?.includes("Database connection") ||
          error.message?.includes("503")) {
        toast({
          title: "Connection Error",
          description: "We're having trouble connecting to our servers. Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle validation errors
      if (error.message?.includes("VALIDATION_ERROR") || 
          error.message?.includes("400") ||
          error.message?.includes("Invalid")) {
        toast({
          title: "Invalid Trip Data",
          description: "Some trip details appear to be invalid. Please check your trip information and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Add a Retry button for the user
      toast({
        title: "Error Saving Trip",
        description: 
          <div className="space-y-2">
            <p>{error.message || "An unexpected error occurred while saving your trip."}</p>
            <Button 
              onClick={handleSaveTrip} 
              variant="outline" 
              size="sm"
              className="mt-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Try Again
            </Button>
          </div>,
        variant: "destructive",
      });
    },
  });

  // Extract trip details function
  const extractTripDetails = (message: string) => {
    // Extraction logic remains unchanged
    // Check for destination
    if (!tripDetails.destination && !collectedDetails.includes('destination')) {
      const destinationRegex = /(?:to|in|visit|going to) ([A-Z][a-zA-Z\s]+)(?:\.|\,|\!|\?|$)/;
      const destinationMatch = message.match(destinationRegex);
      if (destinationMatch && destinationMatch[1]) {
        setTripDetails(prev => ({ ...prev, destination: destinationMatch[1].trim() }));
        setCollectedDetails(prev => [...prev, 'destination']);
        return true;
      }
    }
    
    // Check for dates
    if ((!tripDetails.startDate || !tripDetails.endDate) && !collectedDetails.includes('dates')) {
      const dateRangeRegex = /(?:from|between) ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?,? \d{4}) (?:to|and|until|through) ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?,? \d{4})/i;
      const dateRangeMatch = message.match(dateRangeRegex);
      if (dateRangeMatch && dateRangeMatch[1] && dateRangeMatch[2]) {
        try {
          const startDate = new Date(dateRangeMatch[1]);
          const endDate = new Date(dateRangeMatch[2]);
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            setTripDetails(prev => ({ ...prev, startDate, endDate }));
            setCollectedDetails(prev => [...prev, 'dates']);
            return true;
          }
        } catch (e) {
          // Couldn't parse the dates
        }
      }
    }
    
    // Check for budget
    if (tripDetails.budget === 0 && !collectedDetails.includes('budget')) {
      const budgetRegex = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
      const budgetMatch = message.match(budgetRegex);
      if (budgetMatch && budgetMatch[1]) {
        const budget = parseInt(budgetMatch[1].replace(/,/g, ''));
        if (!isNaN(budget)) {
          setTripDetails(prev => ({ ...prev, budget }));
          setCollectedDetails(prev => [...prev, 'budget']);
          return true;
        }
      }
    }
    
    // The rest of the extraction logic remains unchanged
    // Check for number of people
    if (tripDetails.numberOfPeople === 1 && !collectedDetails.includes('people')) {
      const peopleRegex = /(\d+) (?:people|person|travelers|adults|guests)/i;
      const peopleMatch = message.match(peopleRegex);
      if (peopleMatch && peopleMatch[1]) {
        const people = parseInt(peopleMatch[1]);
        if (!isNaN(people) && people > 0) {
          setTripDetails(prev => ({ ...prev, numberOfPeople: people }));
          setCollectedDetails(prev => [...prev, 'people']);
          return true;
        }
      }
    }
    
    // Check for accommodation types
    if (tripDetails.accommodationType.length === 0 && !collectedDetails.includes('accommodation')) {
      const accommodationTypes = ['hotel', 'hostel', 'apartment', 'airbnb', 'resort', 'villa', 'cottage'];
      const mentionedTypes: string[] = [];
      
      for (const type of accommodationTypes) {
        if (message.toLowerCase().includes(type)) {
          mentionedTypes.push(type);
        }
      }
      
      if (mentionedTypes.length > 0) {
        setTripDetails(prev => ({ ...prev, accommodationType: mentionedTypes }));
        setCollectedDetails(prev => [...prev, 'accommodation']);
        return true;
      }
    }
    
    // Check for activity types
    if (tripDetails.activityTypes.length === 0 && !collectedDetails.includes('activities')) {
      const activityTypes = [
        'sightseeing', 'museums', 'beaches', 'hiking', 'shopping', 
        'food', 'nightlife', 'cultural', 'historical', 'adventure',
        'relaxation', 'nature', 'sports'
      ];
      const mentionedActivities: string[] = [];
      
      for (const type of activityTypes) {
        if (message.toLowerCase().includes(type)) {
          mentionedActivities.push(type);
        }
      }
      
      if (mentionedActivities.length > 0) {
        setTripDetails(prev => ({ ...prev, activityTypes: mentionedActivities }));
        setCollectedDetails(prev => [...prev, 'activities']);
        return true;
      }
    }
    
    // Check for activity frequency
    if (!collectedDetails.includes('frequency')) {
      const frequencyMap = {
        'packed': 'busy',
        'busy': 'busy',
        'full': 'busy',
        'relaxed': 'relaxed',
        'slow': 'relaxed',
        'moderate': 'moderate',
        'balanced': 'moderate'
      };
      
      for (const [keyword, value] of Object.entries(frequencyMap)) {
        if (message.toLowerCase().includes(keyword)) {
          setTripDetails(prev => ({ ...prev, activityFrequency: value }));
          setCollectedDetails(prev => [...prev, 'frequency']);
          return true;
        }
      }
    }
    
    return false;
  };

  // Function to check if we have all required details
  const hasAllRequiredDetails = () => {
    return (
      tripDetails.destination &&
      tripDetails.startDate &&
      tripDetails.endDate &&
      tripDetails.budget > 0 &&
      tripDetails.accommodationType.length > 0 &&
      tripDetails.activityTypes.length > 0 &&
      collectedDetails.includes('frequency')
    );
  };

  // Function for confirmation dialog
  const promptForConfirmation = () => {
    if (hasAllRequiredDetails() && !tripDetails.confirmed && !showConfirmation) {
      setShowConfirmation(true);
      
      // Add a confirmation message from the assistant
      const confirmationMessage = `
Great! I have all the details I need for your trip to ${tripDetails.destination}.

Here's what I've collected:
- Destination: ${tripDetails.destination}
- Dates: ${tripDetails.startDate ? format(tripDetails.startDate, 'MMM d, yyyy') : 'Not specified'} to ${tripDetails.endDate ? format(tripDetails.endDate, 'MMM d, yyyy') : 'Not specified'}
- Budget: $${tripDetails.budget}
- Number of travelers: ${tripDetails.numberOfPeople}
- Accommodation preferences: ${tripDetails.accommodationType.join(', ')}
- Activity interests: ${tripDetails.activityTypes.join(', ')}
- Pace preference: ${tripDetails.activityFrequency}

Is this information correct? I'll create your itinerary once you confirm.
      `;
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: confirmationMessage,
        timestamp: new Date()
      }]);
    }
  };

  // Chat with AI function
  const chatWithAI = async (message: string) => {
    if (!message.trim()) return;

    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Extract trip details from the user message
      const detailsFound = extractTripDetails(message);
      
      // Check if we should show confirmation
      if (hasAllRequiredDetails()) {
        promptForConfirmation();
      }

      // Prepare trip details to send to the API
      let tripDetailsForAPI = null;
      if (hasAllRequiredDetails() && tripDetails.confirmed) {
        tripDetailsForAPI = {
          destination: tripDetails.destination,
          startDate: tripDetails.startDate?.toISOString(),
          endDate: tripDetails.endDate?.toISOString(),
          budget: tripDetails.budget,
          numberOfPeople: tripDetails.numberOfPeople,
          accommodationType: tripDetails.accommodationType,
          activityTypes: tripDetails.activityTypes,
          activityFrequency: tripDetails.activityFrequency
        };
      }
      
      // Make API request
      const response = await apiRequest('POST', '/api/trips/ai-chat', {
        message,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        tripDetails: tripDetailsForAPI
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      
      // Add AI message
      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // If a plan was provided, store it
      if (data.plan && tripDetails.confirmed) {
        setGeneratedPlan(data.plan);
        console.log("Received full itinerary from server:", data.plan);
      }
    } catch (error) {
      console.error('Error in AI chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to get a response from the AI. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle confirmation of trip details
  const handleConfirmDetails = (retry = false) => {
    // Update state to mark details as confirmed
    setTripDetails(prev => ({ ...prev, confirmed: true }));
    setShowConfirmation(false);
    
    // Send a confirmation message from the user and trigger itinerary generation
    const confirmMessage = retry 
      ? 'Yes, please try again to generate my itinerary.' 
      : 'Yes, that information is correct. Please create my itinerary.';
    
    // Add user confirmation to chat history immediately for better UX
    if (!retry) {
      setMessages(prev => [...prev, {
        role: 'user',
        content: confirmMessage,
        timestamp: new Date()
      }]);
    }
    
    // Add loading state while waiting for response
    setLoading(true);
    
    // Make API request with confirmed flag to generate itinerary
    apiRequest('POST', '/api/trips/ai-chat', {
      message: confirmMessage,
      messages: [...messages, { role: 'user', content: confirmMessage }],
      tripDetails: { ...tripDetails, confirmed: true }
    })
    .then(async response => {
      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }]);
      
      // Store the generated plan if one was provided
      if (data.plan) {
        setGeneratedPlan(data.plan);
        console.log("Received full itinerary from server:", data.plan);
      } else if (data.response.toLowerCase().includes("error") || 
                data.response.toLowerCase().includes("issue") || 
                data.response.toLowerCase().includes("problem") ||
                data.response.toLowerCase().includes("apologize")) {
        // If AI apologizes or mentions an error but no plan was returned, add a retry button
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'system',
            content: 'Would you like to try generating your itinerary again?',
            timestamp: new Date()
          }]);
          setShowRetryGeneration(true);
        }, 1000);
      }
    })
    .catch(error => {
      console.error('Error generating itinerary:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate your itinerary. Please try again.',
        variant: 'destructive'
      });
      setShowRetryGeneration(true);
    })
    .finally(() => {
      setLoading(false);
    });
  };

  // Handle key down event for the input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        chatWithAI(input);
      }
    }
  };

  // Handle save trip
  const handleSaveTrip = () => {
    if (!generatedPlan) {
      toast({
        title: 'Error',
        description: 'No itinerary to save. Please generate an itinerary first.',
        variant: 'destructive'
      });
      return;
    }
    
    createTripMutation.mutate(generatedPlan);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left Side: Chat Interface */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Travel Planner</CardTitle>
              <CardDescription>Chat with our AI to create your perfect itinerary</CardDescription>
            </div>
            {collectedDetails.length > 0 && (
              <div className="flex space-x-1">
                {collectedDetails.includes('destination') && (
                  <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900">
                    <MapPin className="h-3 w-3 mr-1" />
                    {tripDetails.destination}
                  </Badge>
                )}
                {collectedDetails.includes('dates') && (
                  <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {tripDetails.startDate && format(tripDetails.startDate, 'MMM d')} - {tripDetails.endDate && format(tripDetails.endDate, 'MMM d')}
                  </Badge>
                )}
                {collectedDetails.includes('budget') && (
                  <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900">
                    <DollarSign className="h-3 w-3 mr-1" />
                    ${tripDetails.budget}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto px-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : message.role === 'system'
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.role !== 'user' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <Badge variant="outline" className="text-xs">Juno AI</Badge>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {loading && (
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {/* Show retry generation button if needed */}
            {showRetryGeneration && (
              <div className="flex justify-center mt-4">
                <Button onClick={() => {
                  setShowRetryGeneration(false);
                  handleConfirmDetails(true);
                }}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-3">
          <div className="flex w-full items-center space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your trip, e.g., 'I want to go to Paris for a week in June'"
              className="min-h-10 resize-none flex-1"
              disabled={loading}
            />
            <Button 
              onClick={() => chatWithAI(input)} 
              disabled={loading || input.trim() === ''}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Right Side: Itinerary Display - Only shown when a plan is generated */}
      {generatedPlan && (
        <Card className="flex flex-col h-full overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Trip Itinerary</CardTitle>
                <CardDescription>Complete itinerary for your trip to {tripDetails.destination}</CardDescription>
              </div>
              <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-grow overflow-auto">
            <div className="space-y-4">
              {/* Trip Overview */}
              <div className="bg-muted/20 rounded-md p-3 mb-4">
                <div className="flex flex-wrap items-center justify-between mb-2">
                  <h4 className="font-medium text-lg">Trip to {tripDetails.destination}</h4>
                  <div className="flex space-x-2 mt-1 sm:mt-0">
                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {tripDetails.startDate ? format(tripDetails.startDate, 'MMM d') : ''} - {tripDetails.endDate ? format(tripDetails.endDate, 'MMM d') : ''}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900">
                      <DollarSign className="h-3 w-3 mr-1" />
                      ${tripDetails.budget}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Trip Overview</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      <li><span className="font-medium text-foreground">Destination:</span> {tripDetails.destination}</li>
                      <li><span className="font-medium text-foreground">Dates:</span> {tripDetails.startDate ? format(tripDetails.startDate, 'MMM d, yyyy') : ''} - {tripDetails.endDate ? format(tripDetails.endDate, 'MMM d, yyyy') : ''}</li>
                      <li><span className="font-medium text-foreground">Budget:</span> ${tripDetails.budget}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Preferences</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      <li><span className="font-medium text-foreground">Travelers:</span> {tripDetails.numberOfPeople}</li>
                      <li><span className="font-medium text-foreground">Accommodation:</span> {tripDetails.accommodationType.join(', ')}</li>
                      <li><span className="font-medium text-foreground">Activity Types:</span> {tripDetails.activityTypes.join(', ')}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Daily Itinerary */}
              <div>
                <h5 className="text-md font-medium mb-3">Daily Itinerary</h5>
                <div className="space-y-4">
                  {generatedPlan.days.map((day: any, dayIndex: number) => (
                    <div key={dayIndex} className="p-3 border border-muted rounded">
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="font-medium">Day {dayIndex + 1}: {day.date} ({day.dayOfWeek})</h6>
                        {day.aiSuggestions?.weatherContext && (
                          <Badge className={day.aiSuggestions.weatherContext.is_suitable_for_outdoor 
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
                            : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100"}>
                            {day.aiSuggestions.weatherContext.description}, {Math.round(day.aiSuggestions.weatherContext.temperature)}°F
                          </Badge>
                        )}
                      </div>
                      
                      {/* Full day's activities with details */}
                      <div className="space-y-3 mt-2">
                        {day.activities.timeSlots.map((activity: any, actIndex: number) => (
                          <div key={actIndex} className="p-2 bg-muted/20 rounded">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{activity.time} - {activity.activity}</p>
                                <p className="text-xs text-muted-foreground mt-1">{activity.location}</p>
                                {activity.notes && (
                                  <p className="text-xs mt-1 italic">{activity.notes}</p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {activity.duration}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t p-4">
            <div className="w-full flex justify-end">
              <Button 
                onClick={handleSaveTrip} 
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={createTripMutation.isPending}
              >
                {createTripMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Trip...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save Trip
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}