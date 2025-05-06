import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  value?: Date;
  onChange: (date?: Date) => void;
  disabled?: boolean;
  showTimeSelect?: boolean;
  placeholderText?: string;
}

export function DatePicker({ 
  value, 
  onChange, 
  disabled = false,
  showTimeSelect = false,
  placeholderText = "Pick a date"
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [hours, setHours] = React.useState<number>(value ? value.getHours() : 0);
  const [minutes, setMinutes] = React.useState<number>(value ? value.getMinutes() : 0);

  React.useEffect(() => {
    setSelectedDate(value);
    if (value) {
      setHours(value.getHours());
      setMinutes(value.getMinutes());
    }
  }, [value]);

  // Update date and time
  const handleDateSelect = (date?: Date) => {
    if (!date) {
      setSelectedDate(undefined);
      onChange(undefined);
      return;
    }

    setSelectedDate(date);

    if (showTimeSelect) {
      // Preserve the time values when date changes
      const newDate = new Date(date);
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
      onChange(newDate);
    } else {
      onChange(date);
    }
  };

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    if (!selectedDate) return;

    setHours(newHours);
    setMinutes(newMinutes);

    const newDate = new Date(selectedDate);
    newDate.setHours(newHours);
    newDate.setMinutes(newMinutes);
    onChange(newDate);
  };

  const formatDisplayText = () => {
    if (!selectedDate) return placeholderText;
    
    if (showTimeSelect) {
      return format(selectedDate, "PPP 'at' h:mm aa");
    }
    
    return format(selectedDate, "PPP");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          {showTimeSelect ? (
            <Clock className="mr-2 h-4 w-4" />
          ) : (
            <CalendarIcon className="mr-2 h-4 w-4" />
          )}
          <span>{formatDisplayText()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={disabled}
            initialFocus
          />
          
          {showTimeSelect && selectedDate && (
            <div className="border-t p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="hours">Time</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="hours"
                    type="number"
                    min={0}
                    max={23}
                    value={hours}
                    onChange={(e) => handleTimeChange(parseInt(e.target.value) || 0, minutes)}
                    className="w-16"
                  />
                  <span>:</span>
                  <Input
                    id="minutes"
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => handleTimeChange(hours, parseInt(e.target.value) || 0)}
                    className="w-16"
                  />
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTimeChange(9, 0)}
                >
                  9:00 AM
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTimeChange(12, 0)}
                >
                  12:00 PM
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTimeChange(17, 0)}
                >
                  5:00 PM
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}