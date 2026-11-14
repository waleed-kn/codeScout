import { RepoView } from "@/components/RepoView";

interface RepoPageProps {
  params: Promise<{ id: string }>;
}

export default async function RepoPage({ params }: RepoPageProps) {
  const { id } = await params;
  return <RepoView id={id} />;
}
