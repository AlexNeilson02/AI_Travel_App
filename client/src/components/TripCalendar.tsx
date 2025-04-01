import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, DateSelectArg, EventChangeArg, EventClickArg } from '@fullcalendar/core';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TimeSlot {
  time: string;
  activity: string;
  location: string;
  duration: string;
  notes: string;
  isEdited: boolean;
  url?: string;
}

interface TripCalendarProps {
  tripDays: any[];
  onSaveEvents: (events: EventInput[]) => Promise<void>;
  tripStartDate: string;
  tripEndDate: string;
}

export default function TripCalendar({ tripDays, onSaveEvents, tripStartDate, tripEndDate }: TripCalendarProps) {
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar | null>(null);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [navigateAwayCallback, setNavigateAwayCallback] = useState<(() => void) | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventInput | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<EventInput>>({
    title: '',
    start: '',
    end: '',
    extendedProps: {
      location: '',
      notes: ''
    }
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'timeGridWeek' | 'timeGridDay'>('timeGridWeek');

  // Convert trip days to calendar events
  useEffect(() => {
    if (tripDays && tripDays.length > 0) {
      const calendarEvents: EventInput[] = [];
      
      tripDays.forEach(day => {
        if (day.activities && day.activities.timeSlots) {
          day.activities.timeSlots.forEach((slot: TimeSlot) => {
            // Extract hours and minutes from time string (format: "HH:MM")
            const [hours, minutes] = slot.time.split(':').map((part: string) => parseInt(part, 10));
            
            // Create date object for the event start
            const eventDate = new Date(day.date);
            eventDate.setHours(hours, minutes, 0, 0);
            
            // Calculate end time based on duration (format: "X hours Y minutes" or "X hours" or "Y minutes")
            const durationMatch = slot.duration.match(/(\d+)\s*hours?(?:\s*and\s*)?(?:(\d+)\s*minutes?)?/) || 
                                  slot.duration.match(/(\d+)\s*minutes?/);
            
            let durationMinutes = 60; // Default duration: 1 hour
            
            if (durationMatch) {
              if (durationMatch[1] && durationMatch[2]) {
                // Hours and minutes
                durationMinutes = parseInt(durationMatch[1], 10) * 60 + parseInt(durationMatch[2], 10);
              } else if (durationMatch[1] && durationMatch[0].includes('hour')) {
                // Only hours
                durationMinutes = parseInt(durationMatch[1], 10) * 60;
              } else if (durationMatch[1]) {
                // Only minutes
                durationMinutes = parseInt(durationMatch[1], 10);
              }
            }
            
            // Create end date by adding duration
            const endDate = new Date(eventDate);
            endDate.setMinutes(endDate.getMinutes() + durationMinutes);
            
            calendarEvents.push({
              id: `${day.date}-${slot.time}-${slot.activity}`,
              title: slot.activity,
              start: eventDate,
              end: endDate,
              extendedProps: {
                location: slot.location,
                notes: slot.notes,
                duration: slot.duration,
                url: slot.url
              }
            });
          });
        }
      });
      
      setEvents(calendarEvents);
    }
  }, [tripDays]);

  // Handler for selecting time slots to create new events
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const startStr = format(selectInfo.start, "HH:mm");
    const endStr = format(selectInfo.end, "HH:mm");
    
    setNewEvent({
      title: '',
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      extendedProps: {
        location: '',
        notes: '',
        duration: calculateDuration(selectInfo.start, selectInfo.end)
      }
    });
    
    setShowEventDialog(true);
  };

  // Handler for clicking on existing events
  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      extendedProps: {
        location: clickInfo.event.extendedProps.location || '',
        notes: clickInfo.event.extendedProps.notes || '',
        duration: clickInfo.event.extendedProps.duration || ''
      }
    });
    
    setShowEventDialog(true);
  };

  // Handler for moving/resizing events
  const handleEventChange = (changeInfo: EventChangeArg) => {
    setHasUnsavedChanges(true);
    
    const updatedEvents = events.map(event => {
      if (event.id === changeInfo.event.id) {
        return {
          ...event,
          start: changeInfo.event.startStr,
          end: changeInfo.event.endStr,
          extendedProps: {
            ...event.extendedProps,
            duration: calculateDuration(
              new Date(changeInfo.event.startStr), 
              new Date(changeInfo.event.endStr)
            )
          }
        };
      }
      return event;
    });
    
    setEvents(updatedEvents);
  };

  // Save new event
  const handleSaveEvent = () => {
    if (!newEvent.title) {
      toast({
        title: "Event title required",
        description: "Please enter a title for the event",
        variant: "destructive"
      });
      return;
    }

    if (selectedEvent) {
      // Updating existing event
      const updatedEvents = events.map(event => {
        if (event.id === selectedEvent.id) {
          return {
            ...event,
            title: newEvent.title || selectedEvent.title,
            extendedProps: {
              ...event.extendedProps,
              location: newEvent.extendedProps?.location || selectedEvent.extendedProps?.location,
              notes: newEvent.extendedProps?.notes || selectedEvent.extendedProps?.notes
            }
          };
        }
        return event;
      });
      
      setEvents(updatedEvents);
    } else {
      // Creating new event
      const newEventWithId = {
        ...newEvent,
        id: `new-${Date.now()}`,
        title: newEvent.title
      };
      
      setEvents([...events, newEventWithId as EventInput]);
    }
    
    setHasUnsavedChanges(true);
    setShowEventDialog(false);
    setNewEvent({
      title: '',
      start: '',
      end: '',
      extendedProps: {
        location: '',
        notes: ''
      }
    });
    setSelectedEvent(null);
  };

  // Delete event
  const handleDeleteEvent = () => {
    if (selectedEvent) {
      const updatedEvents = events.filter(event => event.id !== selectedEvent.id);
      setEvents(updatedEvents);
      setHasUnsavedChanges(true);
    }
    
    setShowEventDialog(false);
    setSelectedEvent(null);
  };

  // Calculate duration string from start and end times
  const calculateDuration = (start: Date, end: Date): string => {
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes`;
    } else if (diffMinutes % 60 === 0) {
      return `${diffMinutes / 60} hours`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours} hours and ${minutes} minutes`;
    }
  };

  // Save all events
  const handleSaveAllEvents = async () => {
    try {
      await onSaveEvents(events);
      setHasUnsavedChanges(false);
      toast({
        title: "Calendar Saved",
        description: "All your events have been saved successfully"
      });
      
      if (navigateAwayCallback) {
        navigateAwayCallback();
        setNavigateAwayCallback(null);
      }
    } catch (error) {
      console.error("Error saving events:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save your calendar events. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle tab change attempt with unsaved changes
  const handleTabChange = (callback: () => void) => {
    if (hasUnsavedChanges) {
      setNavigateAwayCallback(() => callback);
      setShowUnsavedDialog(true);
    } else {
      callback();
    }
  };

  // Toggle between week and day view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'timeGridWeek' ? 'timeGridDay' : 'timeGridWeek');
    
    // Update calendar view
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(viewMode === 'timeGridWeek' ? 'timeGridDay' : 'timeGridWeek');
    }
  };

  return (
    <div className="calendar-container">
      <div className="controls flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleViewMode}
          >
            {viewMode === 'timeGridWeek' ? 'Day View' : 'Week View'}
          </Button>
        </div>
        
        {hasUnsavedChanges && (
          <Button 
            onClick={handleSaveAllEvents} 
            variant="default" 
            className="bg-green-600 hover:bg-green-700"
          >
            Save Changes
          </Button>
        )}
      </div>
      
      <div className="calendar-wrapper h-[600px] bg-white dark:bg-gray-950 rounded-md border p-1">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={viewMode}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          validRange={{
            start: tripStartDate,
            end: tripEndDate
          }}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventChange={handleEventChange}
          editable={true}
          droppable={true}
          allDaySlot={false}
          slotMinTime="05:00:00"
          slotMaxTime="23:00:00"
          slotDuration="00:30:00"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: 'short'
          }}
          height="100%"
        />
      </div>
      
      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
            <DialogDescription>
              {selectedEvent ? 'Make changes to your event.' : 'Add details for your new event.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-title" className="text-right">Title</Label>
              <Input
                id="event-title"
                value={selectedEvent ? (newEvent.title || selectedEvent.title || '') : (newEvent.title || '')}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="col-span-3"
                placeholder="Event title"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-location" className="text-right">Location</Label>
              <Input
                id="event-location"
                value={selectedEvent ? (newEvent.extendedProps?.location || selectedEvent.extendedProps?.location || '') : (newEvent.extendedProps?.location || '')}
                onChange={(e) => setNewEvent({ 
                  ...newEvent, 
                  extendedProps: { 
                    ...newEvent.extendedProps, 
                    location: e.target.value 
                  } 
                })}
                className="col-span-3"
                placeholder="Event location"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="event-notes" className="text-right">Notes</Label>
              <Textarea
                id="event-notes"
                value={selectedEvent ? (newEvent.extendedProps?.notes || selectedEvent.extendedProps?.notes || '') : (newEvent.extendedProps?.notes || '')}
                onChange={(e) => setNewEvent({ 
                  ...newEvent, 
                  extendedProps: { 
                    ...newEvent.extendedProps, 
                    notes: e.target.value 
                  } 
                })}
                className="col-span-3"
                placeholder="Add notes about this event"
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <div>
              {selectedEvent && (
                <Button variant="destructive" onClick={handleDeleteEvent}>
                  Delete Event
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Unsaved Changes Alert */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your calendar. Would you like to save them before continuing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (navigateAwayCallback) {
                navigateAwayCallback();
                setNavigateAwayCallback(null);
              }
              setShowUnsavedDialog(false);
            }}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAllEvents}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}