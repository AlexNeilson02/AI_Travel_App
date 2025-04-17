import { useState, useEffect, useRef, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  RefreshCw,
  Save,
  Clock,
  Sun,
  Cloud
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useMutation } from '@tanstack/react-query';
import { TravelLoadingAnimation } from './TravelLoadingAnimation';

// Define types for our component
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
  // Core state management
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  
  // Trip details state
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
  
  // UI control state
  const [collectedDetails, setCollectedDetails] = useState<string[]>([]);
  const [showRetryGeneration, setShowRetryGeneration] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('destination');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  // Reference for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  
  // Questions to ask in sequence
  const questionSequence = [
    'destination',
    'dates',
    'budget',
    'people',
    'accommodation',
    'activities',
    'frequency',
    'confirmation'
  ];

  // Question text mappings
  const questionText: Record<string, string> = {
    destination: "Where would you like to travel to?",
    dates: "When are you planning to travel? Please provide start and end dates.",
    budget: "What's your budget for this trip?",
    people: "How many people will be traveling?",
    accommodation: "What type of accommodation do you prefer? (hotel, hostel, apartment, vacation rental, etc.)",
    activities: "What types of activities are you interested in? (sightseeing, outdoor activities, food, shopping, etc.)",
    frequency: "Would you prefer a busy itinerary with many activities each day, or a more relaxed pace with more free time?",
    confirmation: "Would you like me to generate your itinerary now?"
  };

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
        content: questionText.destination,
        timestamp: new Date()
      }
    ]);
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Move to next question in the sequence
  const moveToNextQuestion = () => {
    const currentIndex = questionSequence.indexOf(currentQuestion);
    if (currentIndex < questionSequence.length - 1) {
      const nextQuestion = questionSequence[currentIndex + 1];
      setCurrentQuestion(nextQuestion);
      
      // Add AI message for the next question
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: questionText[nextQuestion],
          timestamp: new Date()
        }]);
      }, 600);
    }
  };
  
  // Process user response based on current question
  const processUserResponse = (message: string): boolean => {
    let detailCaptured = false;
    
    switch(currentQuestion) {
      case 'destination':
        const destinationRegex = /(?:to|in|visit|going to|travel to) ([A-Z][a-zA-Z\s]+)(?:\.|\,|\!|\?|$)/i;
        const destinationMatch = message.match(destinationRegex) || message.match(/^([A-Z][a-zA-Z\s]+)(?:\.|\,|\!|\?|$)/i);
        if (destinationMatch && destinationMatch[1]) {
          setTripDetails(prev => ({ ...prev, destination: destinationMatch[1].trim() }));
          setCollectedDetails(prev => [...prev, 'destination']);
          detailCaptured = true;
        }
        break;
        
      case 'dates':
        const dateRangeRegex = /(?:from|between) ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?,? \d{4}) (?:to|and|until|through) ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?,? \d{4})/i;
        const dateRangeMatch = message.match(dateRangeRegex);
        if (dateRangeMatch && dateRangeMatch[1] && dateRangeMatch[2]) {
          try {
            const startDate = new Date(dateRangeMatch[1]);
            const endDate = new Date(dateRangeMatch[2]);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              setTripDetails(prev => ({ ...prev, startDate, endDate }));
              setCollectedDetails(prev => [...prev, 'dates']);
              detailCaptured = true;
            }
          } catch (e) {
            // Couldn't parse the dates
          }
        }
        break;
        
      case 'budget':
        const budgetRegex = /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
        const budgetMatch = message.match(budgetRegex);
        if (budgetMatch && budgetMatch[1]) {
          const budget = parseInt(budgetMatch[1].replace(/,/g, ''));
          if (!isNaN(budget)) {
            setTripDetails(prev => ({ ...prev, budget }));
            setCollectedDetails(prev => [...prev, 'budget']);
            detailCaptured = true;
          }
        }
        break;
        
      case 'people':
        const peopleRegex = /(\d+) (?:people|person|travelers|adults|guests)/i;
        const peopleMatch = message.match(peopleRegex) || message.match(/^(\d+)$/);
        if (peopleMatch && peopleMatch[1]) {
          const people = parseInt(peopleMatch[1]);
          if (!isNaN(people) && people > 0) {
            setTripDetails(prev => ({ ...prev, numberOfPeople: people }));
            setCollectedDetails(prev => [...prev, 'people']);
            detailCaptured = true;
          }
        }
        break;
        
      case 'accommodation':
        const accommodationTypes = ['hotel', 'hostel', 'apartment', 'airbnb', 'resort', 'villa', 'cottage', 'vacation rental'];
        const mentionedTypes: string[] = [];
        
        for (const type of accommodationTypes) {
          if (message.toLowerCase().includes(type)) {
            mentionedTypes.push(type);
          }
        }
        
        if (mentionedTypes.length > 0) {
          setTripDetails(prev => ({ ...prev, accommodationType: mentionedTypes }));
          setCollectedDetails(prev => [...prev, 'accommodation']);
          detailCaptured = true;
        }
        break;
        
      case 'activities':
        const activityTypes = [
          'sightseeing', 'museums', 'beaches', 'hiking', 'shopping', 
          'food', 'nightlife', 'cultural', 'historical', 'adventure',
          'relaxation', 'nature', 'sports', 'outdoor'
        ];
        const mentionedActivities: string[] = [];
        
        for (const type of activityTypes) {
          if (message.toLowerCase().includes(type)) {
            mentionedActivities.push(type);
          }
        }
        
        if (mentionedActivities.length > 0 || message.toLowerCase().includes('everything')) {
          // If user says "everything" or similar, include most activity types
          const selectedActivities = mentionedActivities.length > 0 ? 
            mentionedActivities : 
            ['sightseeing', 'museums', 'beaches', 'hiking', 'shopping', 'food', 'adventure', 'nature'];
            
          setTripDetails(prev => ({ ...prev, activityTypes: selectedActivities }));
          setCollectedDetails(prev => [...prev, 'activities']);
          detailCaptured = true;
        }
        break;
        
      case 'frequency':
        const busyIndicators = ['busy', 'packed', 'full', 'many', 'lots', 'active'];
        const relaxedIndicators = ['relaxed', 'slow', 'leisure', 'free time', 'downtime', 'rest', 'chill'];
        const moderateIndicators = ['moderate', 'balanced', 'mix', 'in between', 'middle'];
        
        let frequency = '';
        
        if (busyIndicators.some(indicator => message.toLowerCase().includes(indicator))) {
          frequency = 'busy';
        } else if (relaxedIndicators.some(indicator => message.toLowerCase().includes(indicator))) {
          frequency = 'relaxed';
        } else if (moderateIndicators.some(indicator => message.toLowerCase().includes(indicator))) {
          frequency = 'moderate';
        }
        
        if (frequency) {
          setTripDetails(prev => ({ ...prev, activityFrequency: frequency }));
          setCollectedDetails(prev => [...prev, 'frequency']);
          detailCaptured = true;
        }
        break;
        
      case 'confirmation':
        const confirmationRegex = /^(yes|yeah|sure|ok|okay|generate|create|go ahead|please do|that sounds good)/i;
        if (message.toLowerCase().match(confirmationRegex)) {
          setTripDetails(prev => ({ ...prev, confirmed: true }));
          // Important: Call generateItinerary directly when confirmation is received
          setTimeout(() => generateItinerary(), 500);
          detailCaptured = true;
        }
        break;
    }
    
    return detailCaptured;
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
      // Process the user's response based on the current question
      const detailCaptured = processUserResponse(message);
      
      // Special case for confirmation
      if (currentQuestion === 'confirmation' && message.toLowerCase().match(/^(yes|yeah|sure|ok|okay|generate|create|go ahead|please do|that sounds good)/i)) {
        setTripDetails(prev => ({ ...prev, confirmed: true }));
        generateItinerary();
        setLoading(false);
        return;
      }
      
      // If we captured a detail, move to the next question
      if (detailCaptured) {
        moveToNextQuestion();
        setLoading(false);
        return;
      }
      
      // If we didn't capture a detail, use the AI to help
      const response = await apiRequest('POST', '/api/trips/ai-chat', {
        message,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        tripDetails: null // We're not generating a plan yet
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }
      
      const data = await response.json();
      
      // Add AI response
      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Try to extract details again from the AI response in case it restated the user's intent
      const aiResponseDetails = processUserResponse(data.response);
      
      // If AI helped us capture a detail, move to the next question
      if (aiResponseDetails) {
        moveToNextQuestion();
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

  // Generate the itinerary after all details are collected
  const generateItinerary = (retry = false) => {
    // Show generating state
    setIsGeneratingPlan(true);
    
    // Send a confirmation message
    const confirmMessage = retry 
      ? 'Yes, please try again to generate my itinerary.' 
      : 'Yes, I would like to generate my itinerary now.';
    
    // Add user confirmation to chat if not retrying
    if (!retry) {
      setMessages(prev => [...prev, {
        role: 'user',
        content: confirmMessage,
        timestamp: new Date()
      }]);
    }
    
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
      setIsGeneratingPlan(false);
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
    onError: (error: any) => {
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
      
      // Generic error
      toast({
        title: "Error Saving Trip",
        description: error.message || "An unexpected error occurred while saving your trip.",
        variant: "destructive",
      });
    },
  });

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
  
  // Render itinerary summary
  const renderItinerarySummary = () => {
    if (!generatedPlan || !generatedPlan.days || generatedPlan.days.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="mb-4">
            <Activity className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Itinerary Generated Yet</h3>
            <p className="text-muted-foreground">
              Complete the conversation with the AI assistant to generate your personalized travel itinerary.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-4 overflow-auto max-h-[calc(100vh-14rem)]">
        <div className="bg-primary/10 p-4 rounded-lg mb-6">
          <h3 className="text-xl font-semibold mb-2">Trip Summary</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-primary" />
              <span className="font-medium">Destination:</span>
              <span className="ml-2">{tripDetails.destination}</span>
            </div>
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
              <span className="font-medium">Dates:</span>
              <span className="ml-2">
                {tripDetails.startDate && format(tripDetails.startDate, 'MMM d, yyyy')} - {tripDetails.endDate && format(tripDetails.endDate, 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-primary" />
              <span className="font-medium">Budget:</span>
              <span className="ml-2">${tripDetails.budget}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-primary" />
              <span className="font-medium">Travelers:</span>
              <span className="ml-2">{tripDetails.numberOfPeople}</span>
            </div>
            <div className="flex items-center">
              <Home className="h-4 w-4 mr-2 text-primary" />
              <span className="font-medium">Accommodation:</span>
              <span className="ml-2">{tripDetails.accommodationType.join(', ')}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-primary" />
              <span className="font-medium">Pace:</span>
              <span className="ml-2">{tripDetails.activityFrequency}</span>
            </div>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-2">Daily Itinerary</h3>
        
        {generatedPlan.days.map((day: any, index: number) => (
          <Card key={index} className="mb-4">
            <CardHeader className="py-3">
              <CardTitle>{format(new Date(day.date), 'EEEE, MMMM d, yyyy')}</CardTitle>
              {day.aiSuggestions?.weatherContext && (
                <CardDescription className="flex items-center text-xs">
                  {day.aiSuggestions.weatherContext.is_suitable_for_outdoor ? (
                    <span className="flex items-center text-green-600 dark:text-green-400">
                      <div className="h-3 w-3 mr-1 bg-green-400 rounded-full" /> 
                      Good weather for outdoor activities
                    </span>
                  ) : (
                    <span className="flex items-center text-amber-600 dark:text-amber-400">
                      <div className="h-3 w-3 mr-1 bg-amber-400 rounded-full" /> 
                      Consider indoor activities
                    </span>
                  )}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="py-2">
              <ul className="space-y-2">
                {day.activities.timeSlots.map((activity: any, actIndex: number) => (
                  <li key={actIndex} className="flex items-start gap-2">
                    <div className="bg-primary/10 text-primary rounded p-1 text-xs font-medium min-w-[60px] text-center">
                      {activity.time}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.activity}</p>
                      <p className="text-sm text-muted-foreground">{activity.location}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
        
        <div className="mt-6 flex gap-4">
          <Button 
            onClick={handleSaveTrip} 
            disabled={createTripMutation.isPending} 
            className="w-full"
          >
            {createTripMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Trip
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full ${generatedPlan ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : ""}`}>
      {/* Left Side: Chat Interface */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Travel Planner</CardTitle>
              <CardDescription>Chat with our AI to create your perfect itinerary</CardDescription>
            </div>
            {collectedDetails.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end">
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
            
            {isGeneratingPlan && (
              <div className="flex flex-col items-center justify-center py-8">
                <TravelLoadingAnimation />
                <p className="text-sm text-muted-foreground mt-4">
                  Creating your personalized travel itinerary...
                </p>
              </div>
            )}
            
            {/* Show retry generation button if needed */}
            {showRetryGeneration && (
              <div className="flex justify-center mt-4">
                <Button onClick={() => {
                  setShowRetryGeneration(false);
                  generateItinerary(true);
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
              placeholder="Type your message here..."
              className="min-h-10 resize-none flex-1"
              disabled={loading || isGeneratingPlan}
            />
            <Button 
              size="icon" 
              onClick={() => chatWithAI(input)} 
              disabled={!input.trim() || loading || isGeneratingPlan}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Right Side: Itinerary Display (shows only when plan is generated) */}
      {generatedPlan && (
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Your Itinerary</CardTitle>
            <CardDescription>
              Your personalized travel plan for {tripDetails.destination}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            {renderItinerarySummary()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}