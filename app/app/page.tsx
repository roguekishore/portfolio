import Contact from "@/components/Contact";
import Hero from "@/components/Hero";
import News from "@/components/News";
import Work from "@/components/Work";

export default function Home() {
  return (
    <main id="main" className="relative">
      <div className="flex flex-col gap-x-4 px-4 md:flex-row">
        <div className="flex min-h-[100svh] w-full flex-col">
          <Hero />
          <Work />
          <News />
          <Contact />
        </div>
      </div>
    </main>
  );
}
