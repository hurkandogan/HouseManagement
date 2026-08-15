"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPropertyById, Property } from "@/app/actions/properties";
import { getExpenses, Expense } from "@/app/actions/expenses";
import { getContracts, Contract } from "@/app/actions/contracts";
import { getCategories, Category } from "@/app/actions/categories";
import { getDocuments, Document } from "@/app/actions/documents";
import { useYear } from "@/lib/contexts/YearContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Loader2, ArrowLeft, 
  Receipt, FileText, TrendingUp, Calendar, AlertCircle, Folder, Download
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function PropertyDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { selectedYear } = useYear();

  const [property, setProperty] = useState<Property | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [prop, allExps, allConts, cats, allDocs] = await Promise.all([
          getPropertyById(id),
          getExpenses(),
          getContracts(),
          getCategories(),
          getDocuments()
        ]);
        
        setProperty(prop);
        setExpenses(allExps.filter(e => e.propertyId === id));
        setContracts(allConts.filter(c => c.propertyId === id));
        setCategories(cats);
        setDocuments(allDocs.filter(d => d.propertyId === id));
      } catch (error) {
        console.error("Error loading property dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Derive filtered data based on the selected year
  const yearExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (e.isArchived) return false;
      return new Date(e.date).getFullYear() === selectedYear;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedYear]);

  const activeContracts = useMemo(() => {
    return contracts.filter(c => {
      if (c.status !== "active") return false;
      // Filter based on whether it is active during this year
      const startYear = new Date(c.startDate).getFullYear();
      const endYear = c.endDate ? new Date(c.endDate).getFullYear() : 9999;
      return selectedYear >= startYear && selectedYear <= endYear;
    });
  }, [contracts, selectedYear]);

  const totalExpenses = yearExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    yearExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return totals;
  }, [yearExpenses]);

  // Sort categories by total descending
  const sortedCategoryBreakdown = Object.entries(categoryTotals)
    .map(([val, sum]) => ({
      val,
      sum,
      label: categories.find(c => c.value === val)?.label || val
    }))
    .sort((a, b) => b.sum - a.sum);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-2xl font-bold text-white">Property Not Found</h2>
        <Button onClick={() => router.push('/properties')} variant="outline" className="border-white/10 text-white hover:bg-white/5">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push('/properties')}
          className="text-zinc-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-1">{property.name}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {property.type}
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <MapPin className="h-4 w-4 text-zinc-500" />
            {property.address || "No address provided"}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-white/10 p-6 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -right-4 -top-4 opacity-5">
            <TrendingUp className="w-32 h-32" />
          </div>
          <div>
            <p className="text-zinc-400 font-medium mb-1">Total Expenses ({selectedYear})</p>
            <h3 className="text-4xl font-bold text-white tracking-tight">€ {totalExpenses.toFixed(2)}</h3>
          </div>
          <div className="mt-4 flex items-center text-xs text-indigo-300 font-medium">
            <Receipt className="h-4 w-4 mr-1.5" />
            {yearExpenses.length} transactions recorded
          </div>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur-md border-white/10 p-6 flex flex-col justify-between">
          <div>
            <p className="text-zinc-400 font-medium mb-1">Active Contracts</p>
            <h3 className="text-4xl font-bold text-white tracking-tight">{activeContracts.length}</h3>
          </div>
          <div className="mt-4 flex items-center text-xs text-emerald-400 font-medium">
            <FileText className="h-4 w-4 mr-1.5" />
            Currently valid in {selectedYear}
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Category Breakdown */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-md border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              Category Breakdown
            </h3>
            
            {sortedCategoryBreakdown.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-6">No expenses found for {selectedYear}.</p>
            ) : (
              <div className="space-y-5">
                {sortedCategoryBreakdown.map((item, index) => {
                  const percentage = totalExpenses > 0 ? (item.sum / totalExpenses) * 100 : 0;
                  // Dynamic colors for variety
                  const colors = [
                    "bg-indigo-500", "bg-purple-500", "bg-emerald-500", 
                    "bg-rose-500", "bg-amber-500", "bg-sky-500"
                  ];
                  const color = colors[index % colors.length];
                  
                  return (
                    <div key={item.val} className="space-y-2">
                      <div className="flex justify-between items-end text-sm">
                        <span className="font-medium text-zinc-300">{item.label}</span>
                        <span className="font-bold text-white">€ {item.sum.toFixed(2)}</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", color)} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-right text-[10px] text-zinc-500 font-medium">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Latest Expenses */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-md border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-400" />
                Latest Expenses in {selectedYear}
              </h3>
              {yearExpenses.length > 5 && (
                <Button variant="link" className="text-indigo-400 hover:text-indigo-300 px-0" onClick={() => router.push('/expenses')}>
                  View All
                </Button>
              )}
            </div>
            
            {yearExpenses.length === 0 ? (
              <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
                <Receipt className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">No expenses recorded for this property in {selectedYear}.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {yearExpenses.slice(0, 5).map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg bg-black/20 hover:bg-white/5 border border-white/5 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-white/10">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{expense.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            {format(new Date(expense.date), "dd MMM yyyy")}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-zinc-700" />
                          <span className="text-indigo-400/80 uppercase tracking-wider font-semibold">
                            {categories.find(c => c.value === expense.category)?.label || expense.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">€ {expense.amount.toFixed(2)}</p>
                      {expense.vendor && (
                        <p className="text-xs text-zinc-500 mt-1">{expense.vendor}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Property Documents */}
          <Card className="bg-zinc-900/50 backdrop-blur-md border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Folder className="h-5 w-5 text-sky-400" />
                Property Documents
              </h3>
              <Button variant="link" className="text-sky-400 hover:text-sky-300 px-0" onClick={() => router.push('/documents')}>
                Manage
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-10 bg-black/20 rounded-lg border border-white/5">
                <Folder className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">No documents attached to this property.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-white/5 border border-white/5 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-10 w-10 rounded-lg bg-black/40 flex items-center justify-center shrink-0 border border-white/5">
                         <FileText className="h-5 w-5 text-sky-400" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-sm text-white truncate">{doc.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{doc.fileName}</p>
                      </div>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-sky-400 hover:bg-sky-400/10">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
        
      </div>
    </div>
  );
}
