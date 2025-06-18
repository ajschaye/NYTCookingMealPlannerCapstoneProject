import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { HelpCircle, Loader2, Utensils, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  dinnerPlanRequestSchema,
  type DinnerPlanRequest,
  type DinnerPlanResponse,
  type Meal,
} from "@shared/schema";

export default function DinnerPlanner() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [webhookPayload, setWebhookPayload] = useState<string>("");
  const [webhookResponse, setWebhookResponse] = useState<string>("");
  const [likedMeals, setLikedMeals] = useState<Set<number>>(new Set());
  const [dislikedMeals, setDislikedMeals] = useState<Set<number>>(new Set());
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedMealForFeedback, setSelectedMealForFeedback] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const { toast } = useToast();

  // Clear webhook payload when test mode is turned off
  const handleTestModeChange = (checked: boolean) => {
    setTestMode(checked);
    if (!checked) {
      setWebhookPayload("");
      setWebhookResponse("");
    }
  };

  // Toggle liked status for a meal
  const toggleLikedMeal = (mealIndex: number) => {
    setLikedMeals(prev => {
      const newLikedMeals = new Set(prev);
      if (newLikedMeals.has(mealIndex)) {
        newLikedMeals.delete(mealIndex);
      } else {
        newLikedMeals.add(mealIndex);
        // Remove from disliked if it was disliked
        setDislikedMeals(prevDisliked => {
          const newDislikedMeals = new Set(prevDisliked);
          newDislikedMeals.delete(mealIndex);
          return newDislikedMeals;
        });
      }
      return newLikedMeals;
    });
  };

  // Handle thumbs down click
  const handleThumbsDown = (mealIndex: number) => {
    setSelectedMealForFeedback(mealIndex);
    setFeedbackDialogOpen(true);
    setFeedbackText("");
  };

  // Submit feedback and mark meal as disliked
  const submitFeedback = () => {
    if (selectedMealForFeedback !== null) {
      setDislikedMeals(prev => {
        const newDislikedMeals = new Set(prev);
        newDislikedMeals.add(selectedMealForFeedback);
        return newDislikedMeals;
      });
      
      // Remove from liked if it was liked
      setLikedMeals(prev => {
        const newLikedMeals = new Set(prev);
        newLikedMeals.delete(selectedMealForFeedback);
        return newLikedMeals;
      });

      console.log('Thumbs down feedback:', {
        mealIndex: selectedMealForFeedback,
        mealName: meals[selectedMealForFeedback]?.mealName || meals[selectedMealForFeedback]?.name,
        feedback: feedbackText
      });

      toast({
        title: "Feedback Received",
        description: "Thank you for your feedback! We'll use it to improve future recommendations.",
      });
    }
    
    setFeedbackDialogOpen(false);
    setSelectedMealForFeedback(null);
    setFeedbackText("");
  };

  // Cancel feedback dialog
  const cancelFeedback = () => {
    setFeedbackDialogOpen(false);
    setSelectedMealForFeedback(null);
    setFeedbackText("");
  };

  const form = useForm<DinnerPlanRequest>({
    resolver: zodResolver(dinnerPlanRequestSchema),
    defaultValues: {
      dinnerCount: undefined,
      preferences: "",
      timestamp: new Date().toISOString(),
    },
  });

  const planDinnersMutation = useMutation({
    mutationFn: async (data: DinnerPlanRequest) => {
      const response = await apiRequest("POST", "/api/plan-dinners", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      console.log('Webhook response:', data);
      
      // Handle different response formats
      let meals: any[] = [];
      
      if (Array.isArray(data)) {
        // If response is directly an array of meals
        meals = data;
      } else if (data.meals && Array.isArray(data.meals)) {
        // If response has meals property
        meals = data.meals;
      } else if (data.success === false) {
        toast({
          title: "Planning Failed",
          description:
            data.message || "Failed to plan your dinners. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Processed meals:', meals);
      setMeals(meals);
      setLikedMeals(new Set()); // Clear liked meals for new results
      setDislikedMeals(new Set()); // Clear disliked meals for new results
      setShowResults(true);

      // Store webhook response for test mode
      if (testMode) {
        setWebhookResponse(JSON.stringify(data, null, 2));
      }

      const dinnerCount = form.getValues("dinnerCount");
      toast({
        title: "Success!",
        description: `Successfully planned ${dinnerCount} delicious dinner${dinnerCount > 1 ? "s" : ""}!`,
      });

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results-container")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    },
    onError: (error: any) => {
      console.error("Error planning dinners:", error);
      
      let errorMessage = "Sorry, we encountered an error planning your dinners. Please try again later.";
      
      // Try to extract more specific error message from the response
      if (error?.response?.json) {
        error.response.json().then((data: any) => {
          if (data?.message) {
            // Store error response for test mode
            if (testMode) {
              setWebhookResponse(JSON.stringify(data, null, 2));
              // In test mode, show the JSON in readable format
              try {
                // Try to parse as JSON
                const jsonData = JSON.parse(data.message);
                const formattedJson = JSON.stringify(jsonData, null, 2);
                toast({
                  title: "Error (Test Mode)",
                  description: formattedJson,
                  variant: "destructive",
                });
              } catch {
                // If not valid JSON, show the raw message
                toast({
                  title: "Error (Test Mode)",
                  description: data.message,
                  variant: "destructive",
                });
              }
            } else {
              // In normal mode, show standard error message
              toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive",
            });
          }
        }).catch(() => {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        });
      } else if (error?.message) {
        if (testMode) {
          try {
            // Try to parse error message as JSON
            const jsonData = JSON.parse(error.message);
            const formattedJson = JSON.stringify(jsonData, null, 2);
            toast({
              title: "Error (Test Mode)",
              description: formattedJson,
              variant: "destructive",
            });
          } catch {
            toast({
              title: "Error (Test Mode)",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } else if (typeof error === 'string') {
        if (testMode) {
          try {
            const jsonData = JSON.parse(error);
            const formattedJson = JSON.stringify(jsonData, null, 2);
            toast({
              title: "Error (Test Mode)",
              description: formattedJson,
              variant: "destructive",
            });
          } catch {
            toast({
              title: "Error (Test Mode)",
              description: error,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: DinnerPlanRequest) => {
    // Store the webhook payload for test mode display
    if (testMode) {
      const webhookPayload = {
        number_of_meals: data.dinnerCount,
        personalization: data.preferences || "",
        mealTypes: ["dinner"]
      };
      setWebhookPayload(JSON.stringify(webhookPayload, null, 2));
    }
    planDinnersMutation.mutate(data);
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-light)" }}
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <Card
          className="mb-8 shadow-sm"
          style={{ borderColor: "var(--border-light)" }}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Utensils
                className="text-2xl h-8 w-8"
                style={{ color: "var(--brand-red)" }}
              />
              <h1
                className="text-2xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Your Personal Dinner Planner
              </h1>
            </div>
          </CardContent>
        </Card>

        {/* Planner Form */}
        <Card
          className="shadow-sm"
          style={{ borderColor: "var(--border-light)" }}
        >
          <CardContent className="p-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {/* Number of Dinners Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <FormField
                      control={form.control}
                      name="dinnerCount"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <div className="flex items-center gap-4">
                            <FormLabel
                              className="text-lg font-bold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              How many dinners would you like to plan?
                            </FormLabel>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Select
                                  onValueChange={(value) =>
                                    field.onChange(parseInt(value))
                                  }
                                  value={field.value?.toString()}
                                >
                                  <SelectTrigger
                                    className="min-w-[120px]"
                                    style={{
                                      borderColor: "var(--border-light)",
                                    }}
                                  >
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 dinner</SelectItem>
                                    <SelectItem value="2">2 dinners</SelectItem>
                                    <SelectItem value="3">3 dinners</SelectItem>
                                    <SelectItem value="4">4 dinners</SelectItem>
                                    <SelectItem value="5">5 dinners</SelectItem>
                                    <SelectItem value="6">6 dinners</SelectItem>
                                    <SelectItem value="7">7 dinners</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    style={{ color: "var(--text-secondary)" }}
                                  >
                                    <HelpCircle className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Select how many different dinner meals you'd
                                    like us to plan for you
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Preferences Section */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="preferences"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-lg font-bold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Tell us about your preferences
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={6}
                            placeholder="Share your favorite cuisines, dietary restrictions, ingredients you love or want to avoid, cooking skill level, time constraints, or any other preferences..."
                            className="resize-none"
                            style={{ borderColor: "var(--border-light)" }}
                          />
                        </FormControl>
                        <p
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Examples: "I love Italian and Mexican food,
                          vegetarian, no nuts, quick 30-minute meals"
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full font-medium py-4 px-6 transition-colors"
                    style={{ backgroundColor: "var(--brand-red)" }}
                    disabled={planDinnersMutation.isPending || !form.watch("dinnerCount")}
                  >
                    {planDinnersMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Planning your dinners...
                      </>
                    ) : (
                      "Plan My Dinners"
                    )}
                  </Button>
                </div>

                {/* Test Mode Webhook Payload Display */}
                {testMode && webhookPayload && (
                  <div className="mt-6 space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border" style={{ borderColor: 'var(--border-light)' }}>
                      <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Webhook Payload:
                      </h3>
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                        {webhookPayload}
                      </pre>
                    </div>
                    
                    {/* Webhook Response Display */}
                    {webhookResponse && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border" style={{ borderColor: 'var(--border-light)' }}>
                        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                          Webhook Response:
                        </h3>
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                          {webhookResponse}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Results */}
        {showResults && (
          <div id="results-container" className="mt-8">
            <Card
              className="shadow-sm"
              style={{ borderColor: "var(--border-light)" }}
            >
              <CardContent className="p-8">
                <h2
                  className="text-2xl font-semibold mb-6"
                  style={{ color: "var(--success)" }}
                >
                  Your Personalized Dinner Plan
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {meals.map((meal, index) => (
                    <Card
                      key={index}
                      className="shadow-sm hover:shadow-md transition-shadow"
                      style={{ borderColor: "var(--border-light)" }}
                    >
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Meal Title - Bold, Red, Clickable */}
                          <div>
                            {meal.mealLink ? (
                              <a
                                href={meal.mealLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                              >
                                {meal.mealName || meal.name}
                              </a>
                            ) : (
                              <h3 className="text-lg font-bold text-red-600">
                                {meal.mealName || meal.name}
                              </h3>
                            )}
                          </div>

                          {/* Cuisine and Cook Time */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {meal.cuisine && (
                              <>
                                <span>{meal.cuisine}</span>
                                {meal.cookTime && <span>•</span>}
                              </>
                            )}
                            {meal.cookTime && <span>{meal.cookTime}</span>}
                          </div>

                          {/* Reason - Single sentence */}
                          {meal.reason && (
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {meal.reason}
                            </p>
                          )}

                          {/* Description fallback if no reason */}
                          {!meal.reason && meal.description && (
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {meal.description}
                            </p>
                          )}

                          {/* Action Icons in bottom right */}
                          <div className="flex justify-end items-center gap-3 mt-4">
                            <button
                              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                              onClick={() => {
                                toggleLikedMeal(index);
                                console.log('Thumbs up:', meal.mealName || meal.name);
                              }}
                              title="Thumbs up"
                            >
                              <ThumbsUp 
                                className={`w-4 h-4 transition-colors ${
                                  likedMeals.has(index) 
                                    ? 'text-green-500 fill-green-500' 
                                    : 'text-gray-500 hover:text-green-500'
                                }`} 
                              />
                            </button>
                            <button
                              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                              onClick={() => handleThumbsDown(index)}
                              title="Thumbs down"
                            >
                              <ThumbsDown 
                                className={`w-4 h-4 transition-colors ${
                                  dislikedMeals.has(index) 
                                    ? 'text-red-500 fill-red-500' 
                                    : 'text-gray-500 hover:text-red-500'
                                }`} 
                              />
                            </button>
                            <button
                              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                              onClick={() => console.log('Regenerate:', meal.mealName || meal.name)}
                              title="Regenerate"
                            >
                              <RotateCcw className="w-4 h-4 text-gray-500 hover:text-blue-500" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      {/* Test Mode Toggle - Fixed position in lower right */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border" style={{ borderColor: 'var(--border-light)' }}>
          <label htmlFor="test-mode" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Test Mode
          </label>
          <Switch
            id="test-mode"
            checked={testMode}
            onCheckedChange={handleTestModeChange}
          />
        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Why wasn't this a good choice?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Tell us why..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              className="resize-none"
              style={{ borderColor: "var(--border-light)" }}
            />
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={cancelFeedback}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={submitFeedback}
              className="flex-1"
              style={{ backgroundColor: "var(--brand-red)" }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
