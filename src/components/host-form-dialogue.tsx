import * as React from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Host } from '../../models/host';

const hostFormSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  hostname: z.string().min(1, 'Hostname is required'),
  port: z.coerce
    .number()
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port must be at most 65535'),
  username: z.string().min(1, 'Username is required'),
  authType: z.enum(['password', 'key', 'agent']),
  password: z.string().optional(),
  privateKeyPath: z.string().optional(),
  privateKeyPassphrase: z.string().optional(),
});

interface HostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: z.infer<typeof hostFormSchema>) => void;
  initialData?: Partial<Host>;
}

export function HostFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: HostFormDialogProps) {
  const form = useForm<z.infer<typeof hostFormSchema>>({
    resolver: zodResolver(hostFormSchema),
    defaultValues: {
      label: initialData?.label || '',
      hostname: initialData?.hostname || '',
      port: initialData?.port || 22,
      username: initialData?.username || '',
      authType: initialData?.authType || 'password',
      password: initialData?.password || '',
      privateKeyPath: initialData?.privateKeyPath || '',
      privateKeyPassphrase: initialData?.privateKeyPassphrase || '',
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Host' : 'Add Host'}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Edit the host connection details.'
              : 'Add a new host connection.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="My Server" {...field} />
                  </FormControl>
                  <FormDescription>
                    A friendly name for this connection
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hostname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hostname</FormLabel>
                  <FormControl>
                    <Input placeholder="example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    The hostname or IP address of the server
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authentication</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select authentication type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="password">Password</SelectItem>
                      <SelectItem value="key">SSH Key</SelectItem>
                      <SelectItem value="agent">SSH Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('authType') === 'password' && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {form.watch('authType') === 'key' && (
              <>
                <FormField
                  control={form.control}
                  name="privateKeyPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Private Key Path</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="privateKeyPassphrase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Passphrase (optional)</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <DialogFooter>
              <Button type="submit">
                {initialData ? 'Save Changes' : 'Add Host'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
