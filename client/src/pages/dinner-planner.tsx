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
import { HelpCircle, Loader2, Utensils } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const { toast } = useToast();

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
    onSuccess: (data: DinnerPlanResponse) => {
      if (data.success === false) {
        toast({
          title: "Planning Failed",
          description:
            data.message || "Failed to plan your dinners. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setMeals(data.meals || []);
      setShowResults(true);

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
    onError: (error) => {
      console.error("Error planning dinners:", error);
      toast({
        title: "Error",
        description:
          "Sorry, we encountered an error planning your dinners. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DinnerPlanRequest) => {
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
                          className="text-lg font-medium"
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
                    disabled={planDinnersMutation.isPending}
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
                  className="text-xl font-semibold mb-6"
                  style={{ color: "var(--text-primary)" }}
                >
                  Your Dinner Plan
                </h2>
                <div className="space-y-4">
                  {meals.map((meal, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                      style={{ borderColor: "var(--border-light)" }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3
                          className="text-lg font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {index + 1}
                        </h3>
                        {meal.cookTime && (
                          <span
                            className="text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {meal.cookTime}
                          </span>
                        )}
                      </div>
                      <p
                        className="mb-4"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {meal.description}
                      </p>
                      {meal.tags && meal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {meal.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="px-2 py-1 text-xs rounded-full"
                              style={{
                                backgroundColor: "var(--muted)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
