"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from "@/app/actions/categories";
import { getTags, createTag, updateTag, deleteTag, Tag } from "@/app/actions/tags";
import { useToast } from "@/lib/contexts/ToastContext";
import { updateProfile, updatePassword as updateFirebasePassword } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Edit2, Trash2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  // Profile States
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Category States
  const [categories, setCategories] = useState<Category[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catValue, setCatValue] = useState("");
  const [catLabel, setCatLabel] = useState("");
  const [catColor, setCatColor] = useState("#ffffff");
  const [catSaving, setCatSaving] = useState(false);

  // Tag States
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagOpen, setTagOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagValue, setTagValue] = useState("");
  const [tagLabel, setTagLabel] = useState("");
  const [tagColor, setTagColor] = useState("#ffffff");
  const [tagSaving, setTagSaving] = useState(false);

  useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.displayName || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadCategories();
    loadTags();
  }, [user]);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadTags() {
    try {
      const data = await getTags();
      setTags(data);
    } catch (e) {
      console.error(e);
    }
  }

  // --- Profile Handlers ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      if (newPassword) {
        await updateFirebasePassword(user, newPassword);
        setNewPassword(""); // clear after success
      }
      alert("Profile updated successfully!");
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setProfileSaving(false);
    }
  };

  // --- Category Handlers ---
  const handleCatOpenChange = (open: boolean) => {
    setCatOpen(open);
    if (!open) {
      setEditingCatId(null);
      setCatValue("");
      setCatLabel("");
      setCatColor("#ffffff");
      setCatSaving(false);
    }
  };

  const handleEditCat = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatValue(cat.value);
    setCatLabel(cat.label);
    setCatColor(cat.color);
    setCatOpen(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatSaving(true);
    try {
      const slug = catValue.trim() || catLabel.trim().toLowerCase().replace(/\s+/g, '-');
      const data = {
        label: catLabel,
        value: slug,
        color: catColor
      };

      if (editingCatId) {
        await updateCategory(editingCatId, data);
        showToast("Category updated successfully", "success");
      } else {
        await createCategory(data);
        showToast("Category created successfully", "success");
      }
      
      await loadCategories();
      setCatOpen(false);
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || "Failed to save category", "error");
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? Any existing expenses using this category may lose their color/label.")) return;
    try {
      await deleteCategory(id);
      await loadCategories();
    } catch (e) {
      console.error(e);
      alert("Failed to delete category.");
    }
  };

  // --- Tag Handlers ---
  const handleTagOpenChange = (open: boolean) => {
    setTagOpen(open);
    if (!open) {
      setEditingTagId(null);
      setTagValue("");
      setTagLabel("");
      setTagColor("#ffffff");
      setTagSaving(false);
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setTagValue(tag.value);
    setTagLabel(tag.label);
    setTagColor(tag.color);
    setTagOpen(true);
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setTagSaving(true);
    try {
      const slug = tagValue.trim() || tagLabel.trim().toLowerCase().replace(/\s+/g, '-');
      const data = { label: tagLabel, value: slug, color: tagColor };

      if (editingTagId) {
        await updateTag(editingTagId, data);
        showToast("Tag updated successfully", "success");
      } else {
        await createTag(data);
        showToast("Tag created successfully", "success");
      }
      
      await loadTags();
      setTagOpen(false);
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || "Failed to save tag", "error");
    } finally {
      setTagSaving(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag? Expenses using it will retain the text but lose styling.")) return;
    try {
      await deleteTag(id);
      await loadTags();
    } catch (e) {
      console.error(e);
      alert("Failed to delete tag.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Settings</h2>
        <p className="text-zinc-400 text-sm">Manage your account, categories, and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-zinc-900 border border-white/10 w-full justify-start rounded-lg mb-6 h-auto p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 py-2.5 px-6 rounded-md transition-all">Profile</TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 py-2.5 px-6 rounded-md transition-all">Categories</TabsTrigger>
          <TabsTrigger value="tags" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 py-2.5 px-6 rounded-md transition-all">Tags</TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 py-2.5 px-6 rounded-md transition-all">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-zinc-100">Profile Settings</CardTitle>
              <CardDescription className="text-zinc-400">Update your account details and security.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Email Address</Label>
                  <Input disabled value={user?.email || ""} className="bg-zinc-900/50 border-zinc-800 text-zinc-500 h-11" />
                  <p className="text-xs text-zinc-500">Email cannot be changed.</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-300">Display Name</Label>
                  <Input 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    placeholder="Enter your name" 
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 h-11" 
                  />
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <Label className="text-zinc-300">New Password</Label>
                  <Input 
                    type="password"
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="Leave blank to keep current password" 
                    className="bg-zinc-900 border-zinc-800 text-zinc-100 h-11" 
                  />
                </div>

                <Button type="submit" disabled={profileSaving} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-4 h-11">
                  {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-zinc-100">Expense Categories</CardTitle>
                <CardDescription className="text-zinc-400">Manage categories used in Expenses and Contracts.</CardDescription>
              </div>
              <Dialog open={catOpen} onOpenChange={handleCatOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-zinc-100 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingCatId ? "Edit Category" : "New Category"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveCat} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Category Name</Label>
                      <Input required value={catLabel} onChange={e => setCatLabel(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="e.g. Legal Fees" />
                    </div>
                    <div className="space-y-2">
                      <Label>Internal Value/Slug (Optional)</Label>
                      <Input value={catValue} onChange={e => setCatValue(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="Auto-generated if left empty" />
                    </div>
                    <div className="space-y-2">
                      <Label>Chart Color</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="color" required value={catColor} onChange={e => setCatColor(e.target.value)} className="bg-zinc-900 border-zinc-800 h-11 w-20 p-1" />
                        <span className="text-zinc-400 text-sm font-mono">{catColor}</span>
                      </div>
                    </div>
                    <Button type="submit" disabled={catSaving} className="w-full bg-indigo-600 hover:bg-indigo-500 h-11">
                      {catSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Category"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/80 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <div>
                        <p className="text-zinc-100 font-medium">{cat.label}</p>
                        <p className="text-xs text-zinc-500 font-mono">{cat.value}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCat(cat)} className="h-8 w-8 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCat(cat.id)} className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-400/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-4">No categories found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-zinc-100">Expense Tags</CardTitle>
                <CardDescription className="text-zinc-400">Manage tags used to label specific expenses.</CardDescription>
              </div>
              <Dialog open={tagOpen} onOpenChange={handleTagOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Add Tag
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-zinc-100 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingTagId ? "Edit Tag" : "New Tag"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveTag} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tag Name</Label>
                      <Input required value={tagLabel} onChange={e => setTagLabel(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="e.g. Plumbing" />
                    </div>
                    <div className="space-y-2">
                      <Label>Internal Value/Slug (Optional)</Label>
                      <Input value={tagValue} onChange={e => setTagValue(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="Auto-generated if left empty" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tag Color</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="color" required value={tagColor} onChange={e => setTagColor(e.target.value)} className="bg-zinc-900 border-zinc-800 h-11 w-20 p-1" />
                        <span className="text-zinc-400 text-sm font-mono">{tagColor}</span>
                      </div>
                    </div>
                    <Button type="submit" disabled={tagSaving} className="w-full bg-indigo-600 hover:bg-indigo-500 h-11">
                      {tagSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Tag"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/80 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }}></div>
                      <div>
                        <p className="text-zinc-100 font-medium">{tag.label}</p>
                        <p className="text-xs text-zinc-500 font-mono">{tag.value}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditTag(tag)} className="h-8 w-8 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-400/10">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(tag.id)} className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-400/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {tags.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-4">No tags found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-zinc-100">App Preferences</CardTitle>
              <CardDescription className="text-zinc-400">Customize how the app looks and feels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label className="text-zinc-300">Currency</Label>
                <select className="flex h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">US Dollar ($)</option>
                </select>
                <p className="text-xs text-zinc-500 mt-1">Currently restricted to EUR across the app.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Theme</Label>
                <select className="flex h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                  <option value="dark">Dark Mode</option>
                  <option value="light" disabled>Light Mode (Coming Soon)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
