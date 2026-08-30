"use client";

import { useEffect, useState, useMemo } from "react";
import { getExpenses, createExpense, updateExpense, deleteExpense, Expense } from "@/app/actions/expenses";
import { getCategories, Category } from "@/app/actions/categories";
import { getProperties, Property } from "@/app/actions/properties";
import { getTags, createTag, Tag as TagModel } from "@/app/actions/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Receipt, MapPin, Loader2, FileText, Upload, CalendarIcon, Euro, ExternalLink, Edit2, Tag, X, Link as LinkIcon, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText as PdfIcon, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useYear } from "@/lib/contexts/YearContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { cn, formatCurrency, parseDDMMYYYY, formatDateDDMMYYYY } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ExpensesPage() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<TagModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [oldDocumentUrl, setOldDocumentUrl] = useState<string | null>(null);
  const [oldFileName, setOldFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const { selectedYear } = useYear();
  
  // Filter states
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // Form states
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [dateStr, setDateStr] = useState(formatDateDDMMYYYY(new Date()));
  const [propertyId, setPropertyId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [contractId, setContractId] = useState<string | null>(null);
  
  // Tag input states
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesData, propertiesData, categoriesData, tagsData] = await Promise.all([
        getExpenses(),
        getProperties(),
        getCategories(),
        getTags()
      ]);
      setExpenses(expensesData);
      setProperties(propertiesData);
      setCategories(categoriesData);
      setAvailableTags(tagsData);
      
      // Check for Pay action from Contracts page
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const action = url.searchParams.get("action");
        if (action === "pay") {
          const pId = url.searchParams.get("propertyId");
          const cId = url.searchParams.get("contractId");
          const cat = url.searchParams.get("category");
          if (pId) setPropertyId(pId);
          if (cId) setContractId(cId);
          if (cat) setCategory(cat);
          setOpen(true);
          // Clean URL so it doesn't reopen on refresh
          window.history.replaceState({}, "", "/expenses");
        }
      }
    } catch (error) {
      console.error("Failed to load expenses data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setTitle("");
    setVendor("");
    setAmount("");
    setDateStr(formatDateDDMMYYYY(new Date()));
    setPropertyId("");
    setCategory("");
    setFile(null);
    setTags([]);
    setEditingId(null);
    setOldDocumentUrl(null);
    setTagInput("");
    setContractId(null);
    setIsSubmitting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  const handleEdit = (expense: Expense) => {
    setTitle(expense.title);
    setVendor(expense.vendor || "");
    setAmount(expense.amount.toString());
    setDateStr(formatDateDDMMYYYY(expense.date));
    setPropertyId(expense.propertyId);
    setCategory(expense.category);
    setTags(expense.tags || []);
    setEditingId(expense.id);
    setOldDocumentUrl(expense.documentUrl);
    setOldFileName(expense.fileName);
    setFile(null);
    setTagInput("");
    setOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      showToast("Please select a property.", "error");
      return;
    }

    const parsedDate = parseDDMMYYYY(dateStr);
    if (!parsedDate) {
      showToast("Invalid date format. Please use DD.MM.YYYY (e.g. 30.08.2026)", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("title", title);
      formData.append("amount", amount);
      formData.append("date", parsedDate.toISOString());
      formData.append("propertyId", propertyId);
      formData.append("category", category);
      if (vendor.trim()) formData.append("vendor", vendor.trim());
      formData.append("tags", JSON.stringify(tags));
      
      if (contractId) {
        formData.append("contractId", contractId);
      }

      if (file) {
        formData.append("file", file);
      }
      if (oldFileName) {
        formData.append("oldFileName", oldFileName);
      }

      let res;
      if (editingId) {
        res = await updateExpense(editingId, formData, oldDocumentUrl);
      } else {
        res = await createExpense(formData);
      }
      
      if (res.success) {
        showToast(editingId ? "Expense updated successfully" : "Expense created successfully", "success");
        setOpen(false);
        resetForm();
        loadData();
      } else {
        showToast(res.error || "Failed to save expense", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "An error occurred while saving the expense", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (expenseToDelete) {
      try {
        const res = await deleteExpense(expenseToDelete.id);
        if (res.success) {
          showToast("Expense archived successfully", "success");
          setExpenseToDelete(null);
          loadData();
        } else {
          showToast(res.error || "Failed to archive expense", "error");
        }
      } catch (err: any) {
        showToast(err?.message || "Error archiving expense", "error");
      }
    }
  };

  const toggleTag = (tagVal: string) => {
    if (tags.includes(tagVal)) {
      setTags(tags.filter(t => t !== tagVal));
    } else {
      setTags([...tags, tagVal]);
    }
  };

  const filteredTags = useMemo(() => {
    if (!tagInput) return [];
    return availableTags.filter(t => 
      t.label.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.value)
    );
  }, [tagInput, availableTags, tags]);

  const addTag = async (tagName: string) => {
    const cleanTag = tagName.trim();
    if (!cleanTag) return;

    // Check if it already exists in availableTags
    const existing = availableTags.find(t => t.label.toLowerCase() === cleanTag.toLowerCase() || t.value.toLowerCase() === cleanTag.toLowerCase());
    
    if (existing) {
      if (!tags.includes(existing.value)) {
        setTags([...tags, existing.value]);
      }
    } else {
      // Create a new tag globally
      const slug = cleanTag.toLowerCase().replace(/\s+/g, '-');
      // Assign a random color
      const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newTagId = await createTag({
        label: cleanTag,
        value: slug,
        color: randomColor
      });
      
      // Update local state immediately for UX
      const newTagObj = { id: newTagId, label: cleanTag, value: slug, color: randomColor, createdAt: new Date().toISOString() };
      setAvailableTags([...availableTags, newTagObj]);
      setTags([...tags, slug]);
    }
    
    setTagInput("");
    setTagInput("");
    setTagSuggestionsOpen(false);
  };

  const visibleExpenses = expenses.filter(e => {
    // 1. Archive filter
    if (!showArchived && e.isArchived) return false;
    
    // 2. Year filter
    const expenseYear = new Date(e.date).getFullYear();
    if (expenseYear !== selectedYear) return false;
    
    // 3. Property filter
    if (filterProperty !== "all" && e.propertyId !== filterProperty) return false;
    
    // 4. Category filter
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    
    // 5. Tag filter
    if (filterTag !== "all") {
      if (!e.tags || !e.tags.includes(filterTag)) return false;
    }
    
    // 6. Month filter
    if (filterMonth !== "all") {
      const expenseMonth = new Date(e.date).getMonth().toString();
      if (expenseMonth !== filterMonth) return false;
    }
    
    // 7. Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = e.title.toLowerCase().includes(q);
      const matchesVendor = e.vendor?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesVendor) return false;
    }
    
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const totalAmount = visibleExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const exportToCSV = () => {
    if (visibleExpenses.length === 0) {
      alert("No data to export.");
      return;
    }
    
    const headers = ["Date", "Expense", "Vendor", "Property", "Category", "Amount", "Document Link"];
    const rows = visibleExpenses.map(e => {
      const property = properties.find(p => p.id === e.propertyId)?.name || "Unknown";
      const cat = categories.find(c => c.value === e.category)?.label || e.category;
      return [
        format(new Date(e.date), "yyyy-MM-dd"),
        `"${e.title.replace(/"/g, '""')}"`,
        `"${e.vendor ? e.vendor.replace(/"/g, '""') : ""}"`,
        `"${property.replace(/"/g, '""')}"`,
        `"${cat.replace(/"/g, '""')}"`,
        e.amount.toFixed(2),
        `"${e.documentUrl ? e.documentUrl.replace(/"/g, '""') : ""}"`
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Expenses_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (visibleExpenses.length === 0) {
      alert("No data to export.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(`Expense Report - ${selectedYear}`, 14, 18);
    
    // Subtitle / Filters
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    let filterText = `Property: ${filterProperty === "all" ? "All" : properties.find(p => p.id === filterProperty)?.name || filterProperty}`;
    filterText += ` | Category: ${filterCategory === "all" ? "All" : categories.find(c => c.value === filterCategory)?.label || filterCategory}`;
    if (filterTag !== "all") filterText += ` | Tag: ${availableTags.find(t => t.value === filterTag)?.label || filterTag}`;
    if (filterMonth !== "all") filterText += ` | Month: ${months[parseInt(filterMonth)]}`;
    
    doc.text(filterText, 14, 25);

    const tableData = visibleExpenses.map(e => {
      const property = properties.find(p => p.id === e.propertyId)?.name || "Unknown";
      const cat = categories.find(c => c.value === e.category)?.label || e.category;
      return [
        format(new Date(e.date), "dd.MM.yyyy"),
        e.title,
        e.vendor || "-",
        property,
        cat,
        formatCurrency(e.amount),
        e.documentUrl || "-"
      ];
    });

    // Add total row
    tableData.push([
      { content: "Total:", colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
      { content: formatCurrency(totalAmount), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
      { content: "", styles: { fillColor: [240, 240, 240] } } as any
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["Date", "Expense", "Vendor", "Property", "Category", "Amount", "Document Link"]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        5: { halign: 'right' },
        6: { cellWidth: 60 }
      }
    });

    doc.save(`Expenses_${selectedYear}.pdf`);
  };
  
  const totalPages = Math.ceil(visibleExpenses.length / itemsPerPage);
  const paginatedExpenses = visibleExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Expenses & Invoices</h2>
          <p className="text-zinc-400 text-sm">Track property expenses and manage invoice documents.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={exportToCSV} variant="outline" className="bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-400" /> CSV
          </Button>
          <Button onClick={exportToPDF} variant="outline" className="bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800">
            <PdfIcon className="mr-2 h-4 w-4 text-rose-400" /> PDF
          </Button>
          <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>
          
          <div className="flex items-center space-x-2 bg-zinc-900/50 border border-white/5 px-3 py-2 rounded-lg">
            <Switch 
              id="archived-mode" 
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="archived-mode" className="text-sm font-medium text-zinc-400 cursor-pointer">
              Show Archived
            </Label>
          </div>

          <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
              <Plus className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          } />
          <DialogContent className="sm:max-w-[550px] bg-zinc-950/95 backdrop-blur-xl border-white/10 text-zinc-100 shadow-2xl overflow-visible">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingId ? "Edit Expense" : "Record Expense"}</DialogTitle>
              <DialogDescription className="text-zinc-400">
                {editingId ? "Update expense details and attached documents." : "Enter expense details and upload the invoice or receipt."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-zinc-300 font-medium">Expense Title</Label>
                  <Input 
                    id="title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="e.g. Roof Repair" 
                    required 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vendor" className="text-zinc-300 font-medium">Company / Vendor (Optional)</Label>
                  <Input 
                    id="vendor" 
                    value={vendor} 
                    onChange={(e) => setVendor(e.target.value)} 
                    placeholder="e.g. Maler Hauck" 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-zinc-300 font-medium">Amount</Label>
                  <div className="relative flex items-center">
                    <Euro className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
                    <Input 
                      id="amount" 
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      placeholder="0.00" 
                      required 
                      className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500 text-zinc-100 pl-9 placeholder:text-zinc-600 rounded-lg h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="expense-date" className="text-zinc-300 font-medium">Date (DD.MM.YYYY)</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
                    <Input
                      id="expense-date"
                      type="text"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      placeholder="DD.MM.YYYY (e.g. 30.08.2026)"
                      required
                      className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500 text-zinc-100 pl-9 placeholder:text-zinc-600 rounded-lg h-11"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300 font-medium">Property</Label>
                  <Select value={propertyId} onValueChange={(val) => setPropertyId(val || "")} required>
                    <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 focus:ring-indigo-500 focus:ring-offset-0 text-zinc-100 rounded-lg h-11">
                      <SelectValue placeholder="Select property">
                        {properties.find(p => p.id === propertyId)?.name || "Select property"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false} className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-60">
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id} className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300 font-medium">Category</Label>
                    <Select value={category} onValueChange={(val) => setCategory(val || "")} required>
                      <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 rounded-lg h-11">
                        <SelectValue placeholder="Select category">
                          {categories.find(c => c.value === category)?.label || "Select category"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-60">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
              </div>

              {/* Tag System */}
              <div className="space-y-2 relative">
                <Label className="text-zinc-300 font-medium">Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {availableTags.map(tag => {
                    const isSelected = tags.includes(tag.value);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.value)}
                        className={cn(
                          "inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                          isSelected
                            ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                            : "border-white/10 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                        )}
                        style={isSelected ? { borderColor: `${tag.color}50`, backgroundColor: `${tag.color}20`, color: tag.color } : {}}
                      >
                        <Tag className="w-3 h-3 mr-1.5" />
                        {tag.label}
                      </button>
                    );
                  })}
                  {availableTags.length === 0 && (
                    <p className="text-sm text-zinc-500">No tags created yet. Type below to create one.</p>
                  )}
                </div>
                <div className="relative">
                  <Input 
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setTagSuggestionsOpen(true);
                    }}
                    onFocus={() => setTagSuggestionsOpen(true)}
                    onBlur={() => setTimeout(() => setTagSuggestionsOpen(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (tagInput) addTag(tagInput);
                      }
                    }}
                    placeholder="Type a new tag and press Enter" 
                    className="bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500 text-zinc-100 placeholder:text-zinc-600 rounded-lg h-11"
                  />
                  {tagSuggestionsOpen && (tagInput || filteredTags.length > 0) && (
                    <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-white/10 rounded-md shadow-lg max-h-40 overflow-auto">
                      {filteredTags.map(tag => (
                        <div 
                          key={tag.id} 
                          className="px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer flex items-center"
                          onClick={() => addTag(tag.value)}
                        >
                          <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tag.color }}></div>
                          {tag.label}
                        </div>
                      ))}
                      {tagInput && !availableTags.find(t => t.label.toLowerCase() === tagInput.trim().toLowerCase()) && (
                        <div 
                          className="px-3 py-2 text-sm text-indigo-400 hover:bg-zinc-800 hover:text-indigo-300 cursor-pointer border-t border-white/5"
                          onClick={() => addTag(tagInput)}
                        >
                          Create &quot;{tagInput}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-zinc-300 font-medium">Invoice / Document {editingId && oldFileName ? "(Replace existing)" : "(Optional)"}</Label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-28 border-2 border-zinc-800 border-dashed rounded-lg cursor-pointer bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {file ? (
                        <>
                          <FileText className="w-8 h-8 text-indigo-400 mb-2" />
                          <p className="text-sm text-zinc-200 font-medium">{file.name}</p>
                          <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </>
                      ) : oldFileName && !file ? (
                        <>
                          <FileText className="w-8 h-8 text-zinc-400 mb-2" />
                          <p className="text-sm text-zinc-200 font-medium">Current: {oldFileName}</p>
                          <p className="text-xs text-zinc-500 mt-1">Click to upload a new file to replace</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                          <p className="mb-2 text-sm text-zinc-400"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-zinc-500">PDF, PNG, JPG or WEBP (MAX. 100MB)</p>
                        </>
                      )}
                    </div>
                    <input 
                      id="dropzone-file" 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                      accept=".pdf,.png,.jpg,.jpeg,.webp" 
                    />
                  </label>
                </div>
              </div>
              
              <DialogFooter className="pt-4 border-t border-white/5">
                <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 disabled:opacity-70 disabled:cursor-not-allowed">
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    editingId ? "Save Changes" : "Save Expense"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
        <Input 
          type="text" 
          placeholder="Search by expense title or vendor name..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 h-12 bg-zinc-900/40 border-white/10 text-zinc-100 placeholder:text-zinc-500 rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Filters Bar */}
      <Card className="border border-white/5 bg-zinc-900/40 backdrop-blur-md p-4 flex flex-col md:flex-row gap-4 items-end shadow-lg flex-wrap">
        <div className="space-y-1.5 flex-1 min-w-[160px]">
          <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter by Month</Label>
          <Select value={filterMonth} onValueChange={(val) => setFilterMonth(val || "all")}>
            <SelectTrigger className="w-full bg-zinc-950/50 border-white/10 text-zinc-200">
              <SelectValue>{filterMonth === "all" ? "All Year" : months[parseInt(filterMonth)]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <SelectItem value="all">All Year</SelectItem>
              {months.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 flex-1 min-w-[160px]">
          <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter by Property</Label>
          <Select value={filterProperty} onValueChange={(val) => setFilterProperty(val || "all")}>
            <SelectTrigger className="w-full bg-zinc-950/50 border-white/10 text-zinc-200">
              <SelectValue>{filterProperty === "all" ? "All Properties" : properties.find(p => p.id === filterProperty)?.name || filterProperty}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5 flex-1 min-w-[160px]">
          <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter by Category</Label>
          <Select value={filterCategory} onValueChange={(val) => setFilterCategory(val || "all")}>
            <SelectTrigger className="w-full bg-zinc-950/50 border-white/10 text-zinc-200">
              <SelectValue>{filterCategory === "all" ? "All Categories" : categories.find(c => c.value === filterCategory)?.label || filterCategory}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 flex-1 min-w-[160px]">
          <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter by Tag</Label>
          <Select value={filterTag} onValueChange={(val) => setFilterTag(val || "all")}>
            <SelectTrigger className="w-full bg-zinc-950/50 border-white/10 text-zinc-200">
              <SelectValue>{filterTag === "all" ? "All Tags" : availableTags.find(t => t.value === filterTag)?.label || filterTag}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <SelectItem value="all">All Tags</SelectItem>
              {availableTags.map(t => (
                <SelectItem key={t.id} value={t.value}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></div>
                    {t.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-4 py-2.5 flex flex-col justify-center min-w-[150px]">
          <span className="text-xs font-medium text-indigo-400 mb-0.5">Total Filtered</span>
          <span className="text-lg font-bold text-indigo-100">{formatCurrency(totalAmount)}</span>
        </div>
      </Card>

      <Card className="border border-white/5 bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-zinc-500 font-medium">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="h-20 w-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
               <Receipt className="h-10 w-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No Expenses Found</h3>
            <p className="text-zinc-500 text-sm max-w-sm mb-6">No expenses match your current filters for the year {selectedYear}.</p>
            {filterProperty !== "all" || filterCategory !== "all" || filterTag !== "all" || filterMonth !== "all" ? (
              <Button onClick={() => { setFilterProperty("all"); setFilterCategory("all"); setFilterTag("all"); setFilterMonth("all"); }} variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white">
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => setOpen(true)} variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white">
                Record First Expense
              </Button>
            )}
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm text-zinc-300">
              <thead className="[&_tr]:border-b [&_tr]:border-white/5 bg-black/20">
                <tr className="border-b transition-colors hover:bg-white/5 data-[state=selected]:bg-zinc-800">
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400 w-32">Date</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Expense</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Vendor</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Property</th>
                  <th className="h-14 px-6 text-left align-middle font-semibold text-zinc-400">Category & Tags</th>
                  <th className="h-14 px-6 text-right align-middle font-semibold text-zinc-400">Amount</th>
                  <th className="h-14 px-6 text-center align-middle font-semibold text-zinc-400 w-24">Doc</th>
                  <th className="h-14 px-6 text-right align-middle font-semibold text-zinc-400 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {paginatedExpenses.map((expense) => {
                  const property = properties.find(p => p.id === expense.propertyId);
                  // Default missing tags to empty array
                  const expenseTags = expense.tags || [];
                  const isArchived = expense.isArchived;
                  
                  return (
                    <tr key={expense.id} className={cn("border-b border-white/5 transition-colors group hover:bg-white/5", isArchived && "opacity-50 grayscale")}>
                      <td className="px-6 py-3 align-middle text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <CalendarIcon className="h-3.5 w-3.5 text-zinc-500" />
                           {format(new Date(expense.date), "dd.MM.yyyy")}
                        </div>
                      </td>
                      <td className="px-6 py-3 align-middle font-medium text-zinc-100">
                        {expense.title}
                        {isArchived && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-red-500/20 text-red-400 border border-red-500/30">Archived</span>}
                      </td>
                      <td className="px-6 py-3 align-middle text-zinc-400">
                        {expense.vendor ? (
                          <span className="text-zinc-300">{expense.vendor}</span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 align-middle text-zinc-400 max-w-[150px] truncate">
                        {property ? (
                          <div className="flex items-center gap-2">
                             <MapPin className="h-3 w-3 text-zinc-500 flex-shrink-0" />
                             <span className="truncate">{property.name}</span>
                          </div>
                        ) : <span className="text-red-400/80">Deleted Property</span>}
                      </td>
                      <td className="px-6 py-3 align-middle">
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className="inline-flex items-center rounded-full bg-zinc-800/50 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 capitalize border border-white/5">
                            {categories.find(c => c.value === expense.category)?.label || expense.category}
                          </div>
                          {expenseTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {expenseTags.map(tagVal => {
                                const t = availableTags.find(at => at.value === tagVal);
                                return (
                                  <span key={tagVal} 
                                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-zinc-800/80 text-zinc-400 border border-white/5"
                                    style={t ? { borderColor: `${t.color}30`, backgroundColor: `${t.color}15`, color: t.color } : {}}
                                  >
                                    <Tag className="w-2.5 h-2.5 mr-1" />
                                    {t ? t.label : tagVal}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 align-middle text-right font-semibold text-zinc-100 whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-3 align-middle text-center">
                        {expense.documentUrl ? (
                           <div className="flex items-center justify-center gap-2">
                             <a 
                               href={expense.documentUrl} 
                               target="_blank" 
                               rel="noreferrer"
                               className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
                               title={expense.fileName || "View Document"}
                             >
                               <ExternalLink className="h-4 w-4" />
                             </a>
                             <button
                               onClick={() => navigator.clipboard.writeText(expense.documentUrl!)}
                               className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 hover:text-zinc-300 transition-colors"
                               title="Copy Link"
                             >
                               <LinkIcon className="h-4 w-4" />
                             </button>
                           </div>
                        ) : (
                           <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 align-middle text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(expense)} 
                            className="text-zinc-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {!isArchived && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setExpenseToDelete(expense)} 
                              className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-black/10">
                <p className="text-xs text-zinc-500 font-medium">
                  Showing <span className="text-zinc-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-zinc-300">{Math.min(currentPage * itemsPerPage, visibleExpenses.length)}</span> of <span className="text-zinc-300">{visibleExpenses.length}</span> expenses
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-white/10 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-white/10 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
      
      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Expense?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to archive <strong>{expenseToDelete?.title}</strong>? 
              <br/><br/>This expense will be hidden from the main list but its records and documents will be preserved in the archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 text-zinc-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">
              Archive Expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
