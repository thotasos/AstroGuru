import type { Metadata } from 'next';
import { ProfileForm } from '@/components/forms/ProfileForm';

export const metadata: Metadata = {
  title: 'New Chart',
  description: 'Create a new Vedic natal chart',
};

export default function NewProfilePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-50">New Chart</h1>
        <p className="text-stone-400 text-sm mt-1">
          Create a Vedic natal chart from birth data
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}
