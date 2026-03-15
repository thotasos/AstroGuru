import { redirect } from 'next/navigation';

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  redirect(`/profile/${id}/chart`);
}
