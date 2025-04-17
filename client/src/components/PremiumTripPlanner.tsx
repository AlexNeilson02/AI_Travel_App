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
  CheckCircle
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
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  // Initialize conversation when component mounts
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
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create trip mutation
  const createTripMutation = useMutation({
    mutationFn: async (plan: any) => {
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
    onError: (error: Error) => {
      // Handle authentication errors
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
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
      
      toast({
        title: "Error creating trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle collecting trip details from the AI conversation
  const extractTripDetails = (message: string) => {
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

  // Function to handle showing the confirmation dialog
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

  // Chat with AI to get trip suggestions
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
      
      // Store the plan if one was generated
      if (data.plan) {
        setGeneratedPlan(data.plan);
        
        // Add a plan creation message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'I\'ve created an itinerary based on your preferences! Would you like to save this trip to your account?',
          timestamp: new Date()
        }]);
      }
      
      // Get the next question to ask, one at a time in sequence
      if (!hasAllRequiredDetails()) {
        setTimeout(() => {
          let followUpMessage = '';
          
          // Only ask one question at a time in a specific sequence
          if (!tripDetails.destination) {
            followUpMessage = 'Where would you like to go on your trip?';
          } else if (!tripDetails.startDate || !tripDetails.endDate) {
            followUpMessage = `Great! I'll help you plan a trip to ${tripDetails.destination}. When are you planning to travel? Please provide start and end dates.`;
          } else if (tripDetails.budget === 0) {
            const days = tripDetails.startDate && tripDetails.endDate ? 
              Math.floor((tripDetails.endDate.getTime() - tripDetails.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
            followUpMessage = `A ${days}-day trip to ${tripDetails.destination} from ${tripDetails.startDate ? format(tripDetails.startDate, 'MMM d') : ''} to ${tripDetails.endDate ? format(tripDetails.endDate, 'MMM d') : ''}. What's your total budget for this trip?`;
          } else if (tripDetails.numberOfPeople === 1 && !collectedDetails.includes('people')) {
            followUpMessage = `With a budget of $${tripDetails.budget}. How many people will be traveling on this trip?`;
          } else if (tripDetails.accommodationType.length === 0) {
            const perPerson = tripDetails.numberOfPeople > 1 ? ` (that's about $${Math.round(tripDetails.budget/tripDetails.numberOfPeople)} per person)` : '';
            followUpMessage = `A ${tripDetails.numberOfPeople}-person trip with a $${tripDetails.budget} budget${perPerson}. What type of accommodation would you prefer (hotel, hostel, apartment, resort, etc.)?`;
          } else if (tripDetails.activityTypes.length === 0) {
            followUpMessage = `I'll look for ${tripDetails.accommodationType.join(', ')} options. What kinds of activities are you interested in for your ${tripDetails.destination} trip? (e.g., sightseeing, museums, beaches, hiking, shopping, food, nightlife, cultural, etc.)`;
          } else if (!collectedDetails.includes('frequency')) {
            followUpMessage = `Great! You're interested in ${tripDetails.activityTypes.join(', ')} activities. Last question: Do you prefer a busy schedule with lots of activities, a moderate pace, or a more relaxed approach with plenty of free time?`;
          }
          
          // Only send a new message if we have a question to ask and we don't already have all required details
          if (followUpMessage && !hasAllRequiredDetails()) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: followUpMessage,
              timestamp: new Date()
            }]);
          } else if (hasAllRequiredDetails() && !tripDetails.confirmed && !showConfirmation) {
            // If we have all details but haven't yet confirmed, show confirmation
            promptForConfirmation();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
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
  const handleConfirmDetails = () => {
    // Update state to mark details as confirmed
    setTripDetails(prev => ({ ...prev, confirmed: true }));
    setShowConfirmation(false);
    
    // Send a confirmation message from the user and trigger itinerary generation
    const confirmMessage = 'Yes, that information is correct. Please create my itinerary.';
    
    // Add user confirmation to chat history immediately for better UX
    setMessages(prev => [...prev, {
      role: 'user',
      content: confirmMessage,
      timestamp: new Date()
    }]);
    
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
      }
      
      setLoading(false);
    })
    .catch(error => {
      console.error('Error confirming trip details:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate your itinerary. Please try again.',
        variant: 'destructive'
      });
      setLoading(false);
    });
  };

  // Handle editing of trip details
  const handleEditDetails = () => {
    setShowConfirmation(false);
    
    // Send a message asking to edit
    chatWithAI('I need to change some of these details.');
  };

  // Handle saving the generated trip
  const handleSaveTrip = () => {
    if (!generatedPlan) {
      toast({
        title: 'Error',
        description: 'No trip plan has been generated yet.',
        variant: 'destructive'
      });
      return;
    }
    
    createTripMutation.mutate(generatedPlan);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatWithAI(input);
    }
  };

  return (
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
        </div>
      </CardContent>
      
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="p-4 mb-4 mx-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <div className="flex items-center mb-3">
            <AlertCircle className="text-blue-600 dark:text-blue-300 w-5 h-5 mr-2" />
            <h3 className="font-semibold">Confirm Trip Details</h3>
          </div>
          <p className="text-sm mb-3">
            I'll create an itinerary based on these details. Is this information correct?
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={handleEditDetails}>
              Edit Details
            </Button>
            <Button size="sm" onClick={handleConfirmDetails}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Confirm
            </Button>
          </div>
        </div>
      )}
      
      {/* Generated Itinerary & Save Trip UI */}
      {generatedPlan && (
        <div className="p-4 mb-4 mx-4 bg-green-50 dark:bg-green-900 rounded-lg">
          <div className="flex items-center mb-3">
            <CheckCircle className="text-green-600 dark:text-green-300 w-5 h-5 mr-2" />
            <h3 className="font-semibold">Trip Plan Created</h3>
          </div>
          <p className="text-sm mb-3">
            Your itinerary is ready! Here's a summary of your trip plan:
          </p>
          
          {/* Trip Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-md p-3 mb-4 max-h-[300px] overflow-y-auto">
            <h4 className="font-medium mb-2">Trip to {tripDetails.destination}</h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>Dates: {tripDetails.startDate ? format(tripDetails.startDate, 'MMM d, yyyy') : 'Not set'} - {tripDetails.endDate ? format(tripDetails.endDate, 'MMM d, yyyy') : 'Not set'}</p>
              <p>Budget: ${tripDetails.budget}</p>
              <p>Travelers: {tripDetails.numberOfPeople}</p>
              <p>Accommodation: {tripDetails.accommodationType.join(', ')}</p>
              <p>Activities: {tripDetails.activityTypes.join(', ')}</p>
            </div>
            
            {/* Day-by-Day Summary */}
            <div className="mt-3 space-y-2">
              <h5 className="text-sm font-medium">Itinerary Highlights:</h5>
              <div className="space-y-2">
                {generatedPlan.days.slice(0, 2).map((day: any, index: number) => (
                  <div key={index} className="p-2 text-xs border border-muted rounded">
                    <p className="font-medium">{day.date} ({day.dayOfWeek})</p>
                    <ul className="list-disc pl-4 mt-1">
                      {day.activities.timeSlots.slice(0, 2).map((activity: any, i: number) => (
                        <li key={i}>{activity.activity}</li>
                      ))}
                      {day.activities.timeSlots.length > 2 && (
                        <li className="text-muted-foreground">+ {day.activities.timeSlots.length - 2} more activities</li>
                      )}
                    </ul>
                    <p className="mt-1 text-muted-foreground">Stay: {day.accommodation?.name}</p>
                  </div>
                ))}
                {generatedPlan.days.length > 2 && (
                  <p className="text-muted-foreground text-center">
                    + {generatedPlan.days.length - 2} more days
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <p className="text-sm mb-3">
            Would you like to save this complete trip to your account?
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              // Add a request for any adjustment
              setInput("The plan looks good, but could you make some changes to it?");
              chatWithAI("The plan looks good, but could you make some changes to it?");
            }}>
              Suggest Changes
            </Button>
            <Button onClick={handleSaveTrip} disabled={createTripMutation.isPending}>
              {createTripMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Save Trip
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
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
  );
}