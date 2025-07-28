import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">LiberaSphere</h1>
      <p className="text-lg text-muted-foreground">Pronti a ricominciare.</p>
      <Button className="mt-4">Iniziamo</Button>
    </main>
  );
}
