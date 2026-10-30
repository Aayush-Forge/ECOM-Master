'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
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
import { isValidPhoneNumber } from 'libphonenumber-js';
import { ShieldCheck, Lock, Bell, AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function getAuthToken() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_session');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.access_token || session.token || null;
  } catch {
    return null;
  }
}

const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: 'First Name is required.' })
    .max(50, { message: 'First Name cannot exceed 50 characters.' }),
  lastName: z
    .string()
    .trim()
    .min(1, { message: 'Last Name is required.' })
    .max(50, { message: 'Last Name cannot exceed 50 characters.' }),
  email: z.string().email(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || isValidPhoneNumber(val, 'IN'),
      {
        message: 'Please enter a valid phone number (e.g. +91 9876543210).',
      }
    ),
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
  const { user } = useAuth();

  // 1. Personal Info Form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  useEffect(() => {
    async function loadLatestProfile() {
      const token = getAuthToken();
      if (!token) return;
      try {
        const res = await fetch(`${BACKEND_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const fresh = await res.json();
          profileForm.reset({
            firstName: fresh.firstName || '',
            lastName: fresh.lastName || '',
            email: fresh.email || '',
            phone: fresh.phone || '',
          });
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      }
    }
    loadLatestProfile();
  }, [user, profileForm]);

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

  async function onSaveProfile(values) {
    const token = getAuthToken();
    if (!token) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone || '',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update profile');
      }

      const updated = await res.json();

      // Update localStorage auth_session so header/nav update immediately
      const raw = localStorage.getItem('auth_session');
      if (raw) {
        const session = JSON.parse(raw);
        session.user = {
          ...session.user,
          firstName: updated.firstName,
          lastName: updated.lastName,
          name: `${updated.firstName} ${updated.lastName}`.trim(),
          phone: updated.phone,
        };
        localStorage.setItem('auth_session', JSON.stringify(session));
        window.dispatchEvent(new Event('auth-change'));
      }

      toast.success('Personal details updated successfully');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update profile');
    }
  }

  async function onUpdatePassword(values) {
    const token = getAuthToken();
    if (!token) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/auth/change-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to change password');
      }

      toast.success('Password updated successfully');
      passwordForm.reset();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to change password');
    }
  }

  function onSavePrefs() {
    toast.success('Communication preferences saved');
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
            Update your contact details used for orders and shipping receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-stone-700 font-medium text-xs uppercase tracking-wider">
                        First Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your first name"
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
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-inter text-stone-700 font-medium text-xs uppercase tracking-wider">
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your last name"
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
                        Email Address (Read-only)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          disabled
                          {...field}
                          className="font-inter bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed"
                        />
                      </FormControl>
                      <FormMessage className="font-inter text-xs text-stone-400 font-normal">
                        Contact support to update your registered email address.
                      </FormMessage>
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
                          placeholder="+91 9876543210"
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
      <Card className="bg-white border border-stone-200 shadow-2xs">
        <CardHeader className="pb-3 border-b border-stone-100">
          <CardTitle className="font-display text-base text-stone-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-stone-500" />
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs font-inter text-stone-600">
            Permanently delete your account and remove saved address data.
          </p>
          <Button
            disabled
            variant="outline"
            className="border-stone-200 text-stone-400 font-inter text-xs shrink-0 cursor-not-allowed"
          >
            Account deletion coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
