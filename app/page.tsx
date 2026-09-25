import HeroSection from "@/components/HeroSection";
import LookbookSection from "@/components/LookbookSection";
import BookingSection from "@/components/BookingSection";
import ReviewsSection from "@/components/ReviewsSection";

export default function Home() {
  return (
    <main className="w-full bg-surface-darkest">
      <HeroSection />
      <LookbookSection />
      <BookingSection />
      <ReviewsSection />
    </main>
  );
}
