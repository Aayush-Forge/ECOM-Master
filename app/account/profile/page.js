'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { currentUser } from '@/lib/mock-user';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { isValidPhoneNumber } from 'libphonenumber-js';
import { ShieldCheck, Lock, Bell, AlertTriangle } from 'lucide-react';

const phoneSchema = z
  .string()
  .trim()
  .min(1, { message: 'Phone Number is required.' })
  .refine(
    (val) => isValidPhoneNumber(val, 'IN'),
    {
      message: 'Please enter a valid phone number (e.g. 9876543210 or +91 98765 43210).',
    }
  );

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Full Name is required.' })
    .max(100, { message: 'Full Name cannot exceed 100 characters.' }),
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email Address is required.' })
    .email({ message: 'Please enter a valid email address.' }),
  phone: phoneSchema,
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required.' }),
    newPassword: z.string().min(6, { message: 'New password must be at least 6 characters.' }),
    confirmPassword: z.string().min(1, { message: 'Please confirm your new password.' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match.',
    path: ['confirmPassword'],
  });

export default function ProfilePage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 1. Personal Info Form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
    },
  });

  // 2. Security Form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // 3. Communication Preferences State
  const [prefs, setPrefs] = useState({
    orderUpdates: true,
    promotions: false,
    whatsapp: true,
  });

  function onSaveProfile(values) {
    console.log('Submitted profile values:', values);
    toast.success('Personal details updated successfully');
  }

  function onUpdatePassword(values) {
    console.log('Submitted password change:', values);
    toast.success('Password updated successfully');
    passwordForm.reset();
  }

  function onSavePrefs() {
    toast.success('Communication preferences saved');
  }

  function handleDeleteAccount() {
    toast.error('Account deletion is restricted in demo mode.');
    setDeleteDialogOpen(false);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-display font-bold text-stone-900 tracking-tight">Account Settings</h2>
        <p className="text-sm font-inter text-stone-500">Manage your profile information, password, and notification preferences.</p>
      </div>

      {/* 1. Personal Information Section */}
      <Card className="bg-white border border-stone-200/80 shadow-2xs">
        <CardHeader className="border-b border-stone-100 pb-4">
          <CardTitle className="font-display text-lg text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-stone-600" />
            Personal Information
          </CardTitle>
          <CardDescription className="font-inter text-xs text-stone-500">
            Update your primary contact details used for orders and shipping receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-inter text-stone-700 font-medium text-xs uppercase tracking-wider">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Aayush Sharma"
                          {...field}
                          className="font-inter bg-stone-50/50 border-stone-200 text-stone-900 focus:bg-white"
                        />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-stone-700 font-medium text-xs uppercase tracking-wider">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="aayush@sridattam.com"
                          type="email"
                          {...field}
                          className="font-inter bg-stone-50/50 border-stone-200 text-stone-900 focus:bg-white"
                        />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-stone-700 font-medium text-xs uppercase tracking-wider">
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+91 98765 43210"
                          {...field}
                          className="font-inter bg-stone-50/50 border-stone-200 text-stone-900 focus:bg-white"
                        />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!profileForm.formState.isValid || profileForm.formState.isSubmitting}
                  className="bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold font-inter shadow-xs px-6 py-2 disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-100 cursor-pointer disabled:cursor-not-allowed text-xs"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 2. Account Security Section */}
      <Card className="bg-white border border-stone-200/80 shadow-2xs">
        <CardHeader className="border-b border-stone-100 pb-4">
          <CardTitle className="font-display text-lg text-stone-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-stone-600" />
            Account Security
          </CardTitle>
          <CardDescription className="font-inter text-xs text-stone-500">
            Change your password to ensure your account remains secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onUpdatePassword)} className="space-y-5">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-inter text-stone-700 font-medium text-xs uppercase tracking-wider">
                      Current Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        className="font-inter bg-stone-50/50 border-stone-200 text-stone-900 focus:bg-white"
                      />
                    </FormControl>
                    <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-stone-700 font-medium text-xs uppercase tracking-wider">
                        New Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="At least 6 characters"
                          {...field}
                          className="font-inter bg-stone-50/50 border-stone-200 text-stone-900 focus:bg-white"
                        />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-stone-700 font-medium text-xs uppercase tracking-wider">
                        Confirm New Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Re-enter new password"
                          {...field}
                          className="font-inter bg-stone-50/50 border-stone-200 text-stone-900 focus:bg-white"
                        />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-red-600 font-medium" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!passwordForm.formState.isValid || passwordForm.formState.isSubmitting}
                  variant="outline"
                  className="font-inter font-semibold border-stone-300 text-stone-800 hover:bg-stone-50 text-xs px-6"
                >
                  Update Password
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 3. Communication Preferences Section */}
      <Card className="bg-white border border-stone-200/80 shadow-2xs">
        <CardHeader className="border-b border-stone-100 pb-4">
          <CardTitle className="font-display text-lg text-stone-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-stone-600" />
            Communication Preferences
          </CardTitle>
          <CardDescription className="font-inter text-xs text-stone-500">
            Control how we notify you about orders and special offers.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold font-inter text-stone-900 block">
                  Order Status & Delivery Updates
                </label>
                <p className="text-xs font-inter text-stone-500">
                  Receive SMS and email notifications regarding order confirmation and dispatch.
                </p>
              </div>
              <Switch
                checked={prefs.orderUpdates}
                onCheckedChange={(checked) => setPrefs({ ...prefs, orderUpdates: checked })}
              />
            </div>

            <div className="border-t border-stone-100 pt-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold font-inter text-stone-900 block">
                  WhatsApp Delivery Alerts
                </label>
                <p className="text-xs font-inter text-stone-500">
                  Get real-time tracking updates directly on WhatsApp.
                </p>
              </div>
              <Switch
                checked={prefs.whatsapp}
                onCheckedChange={(checked) => setPrefs({ ...prefs, whatsapp: checked })}
              />
            </div>

            <div className="border-t border-stone-100 pt-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold font-inter text-stone-900 block">
                  Promotional Offers & Newsletters
                </label>
                <p className="text-xs font-inter text-stone-500">
                  Receive occasional emails about seasonal discounts and festival combos.
                </p>
              </div>
              <Switch
                checked={prefs.promotions}
                onCheckedChange={(checked) => setPrefs({ ...prefs, promotions: checked })}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={onSavePrefs}
              variant="outline"
              className="font-inter font-semibold border-stone-300 text-stone-800 hover:bg-stone-50 text-xs px-6"
            >
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. Delete Account (Danger Zone) */}
      <Card className="bg-white border border-red-200 shadow-2xs">
        <CardHeader className="pb-3 border-b border-red-100/60">
          <CardTitle className="font-display text-base text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs font-inter text-stone-600">
            Permanently delete your account and remove saved address data. This action cannot be undone.
          </p>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="border-red-200 text-red-600 hover:bg-red-50 font-inter text-xs shrink-0"
          >
            Delete Account...
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-stone-900">Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="font-inter text-stone-600">
              Are you sure you want to delete your account? All saved addresses and personal preferences will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white font-inter">
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
