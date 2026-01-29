import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChecklistCard, Checklist } from "@/components/checklists/ChecklistCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Grid, List } from "lucide-react";

const checklists: Checklist[] = [
  {
    id: "1",
    title: "Daily Safety Inspection",
    description: "Comprehensive daily safety check for warehouse operations including PPE verification, hazard identification, and emergency equipment status.",
    category: "Safety",
    itemCount: 24,
    lastUsed: "Today",
    assignedTo: "All Teams",
    status: "active",
  },
  {
    id: "2",
    title: "Equipment Maintenance",
    description: "Monthly equipment inspection and maintenance checklist for all machinery and tools.",
    category: "Maintenance",
    itemCount: 18,
    lastUsed: "3 days ago",
    assignedTo: "Maintenance Team",
    status: "active",
  },
  {
    id: "3",
    title: "Quality Control Audit",
    description: "Production line quality control inspection covering product specifications and compliance.",
    category: "Quality",
    itemCount: 32,
    lastUsed: "1 week ago",
    assignedTo: "QC Team",
    status: "active",
  },
  {
    id: "4",
    title: "Fire Safety Compliance",
    description: "Monthly fire safety inspection including extinguishers, exits, and alarm systems.",
    category: "Safety",
    itemCount: 15,
    lastUsed: "2 weeks ago",
    status: "active",
  },
  {
    id: "5",
    title: "Vehicle Pre-Trip Inspection",
    description: "Pre-trip vehicle safety checklist for fleet vehicles before departure.",
    category: "Fleet",
    itemCount: 22,
    lastUsed: "Yesterday",
    assignedTo: "Drivers",
    status: "active",
  },
  {
    id: "6",
    title: "Hygiene & Sanitation",
    description: "Daily hygiene and sanitation checklist for food handling areas.",
    category: "Hygiene",
    itemCount: 28,
    status: "draft",
  },
  {
    id: "7",
    title: "IT Equipment Audit",
    description: "Quarterly IT equipment inventory and condition assessment.",
    category: "IT",
    itemCount: 12,
    lastUsed: "1 month ago",
    status: "archived",
  },
  {
    id: "8",
    title: "New Employee Onboarding",
    description: "Onboarding checklist for new employee orientation and training completion.",
    category: "HR",
    itemCount: 20,
    status: "active",
  },
];

const categories = ["All", "Safety", "Maintenance", "Quality", "Fleet", "Hygiene", "IT", "HR"];

export default function Checklists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredChecklists = checklists.filter((checklist) => {
    const matchesSearch = checklist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      checklist.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || checklist.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AppLayout title="Checklists">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search checklists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-secondary" : ""}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${viewMode === "list" ? "bg-secondary" : ""}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-4 h-4 mr-2" />
              Create Checklist
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Checklists Grid */}
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
        }>
          {filteredChecklists.map((checklist, index) => (
            <div
              key={checklist.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ChecklistCard checklist={checklist} />
            </div>
          ))}
        </div>

        {filteredChecklists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No checklists found matching your criteria.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
