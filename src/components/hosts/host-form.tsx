import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import type { Host } from '../../../models/host';

const hostSchema = z.object({
  label: z.string().min(1, 'Name is required'),
  hostname: z.string().min(1, 'Hostname is required'),
  port: z.coerce.number().int().positive().default(22),
  username: z.string().optional(),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type HostFormValues = z.infer<typeof hostSchema>;

interface HostFormProps {
  host?: Host;
  onSubmit: (values: HostFormValues) => void;
  onCancel: () => void;
}

export function HostForm({ host, onSubmit, onCancel }: HostFormProps) {
  const [tagInput, setTagInput] = React.useState('');

  const form = useForm<HostFormValues>({
    resolver: zodResolver(hostSchema),
    defaultValues: {
      label: host?.label || '',
      hostname: host?.hostname || '',
      port: host?.port || 22,
      username: host?.username || '',
      password: host?.password || '',
      privateKey: host?.privateKey || '',
      tags: host?.tags || [],
    },
  });

  const handleAddTag = () => {
    if (!tagInput.trim()) return;

    const currentTags = form.getValues('tags') || [];
    if (!currentTags.includes(tagInput.trim())) {
      form.setValue('tags', [...currentTags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue(
      'tags',
      currentTags.filter((t) => t !== tag)
    );
  };

  return (
    <div className="text-white">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="My Server"
                    className="bg-[#252532] border-[#2d2d3a] text-white"
                  />
                </FormControl>
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
                  <Input
                    {...field}
                    placeholder="example.com or 192.168.1.1"
                    className="bg-[#252532] border-[#2d2d3a] text-white"
                  />
                </FormControl>
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
                  <Input
                    {...field}
                    type="number"
                    placeholder="22"
                    className="bg-[#252532] border-[#2d2d3a] text-white"
                  />
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
                  <Input
                    {...field}
                    placeholder="root"
                    className="bg-[#252532] border-[#2d2d3a] text-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="••••••••"
                    className="bg-[#252532] border-[#2d2d3a] text-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag"
                className="bg-[#252532] border-[#2d2d3a] text-white rounded-r-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddTag}
                className="rounded-l-none bg-[#f97316] hover:bg-[#ea580c]">
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {form.watch('tags')?.map((tag) => (
                <div
                  key={tag}
                  className="flex items-center gap-1 px-2 py-1 text-sm rounded-full bg-[#2d2d3a] text-gray-300">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-400 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              type="submit"
              className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white">
              {host ? 'Update' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full border-[#2d2d3a] text-gray-300 hover:bg-[#252532] hover:text-white">
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
