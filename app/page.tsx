import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations('home');
  return (
    <div>
      <div>{t('title')}</div>
      <h1 className="text-2xl font-bold">Welcome to the Monitoring Dashboard</h1>
      <p className="mt-4">Select a section to view metrics and analytics.</p>
      <Button>Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}
