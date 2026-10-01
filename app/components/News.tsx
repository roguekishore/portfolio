import { news, type NewsItem } from "@/lib/content";
import Media from "./Media";
import { BracketLabel } from "./bits";

export default function News() {
  const [feature, ...rest] = news;
  return (
    <section id="news" className="pt-6 pb-16 md:pt-24 md:pb-37">
      <div className="flex items-center justify-between pb-6 md:pb-9">
        <div className="w-full md:px-3">
          <div className="flex w-full items-center justify-between border-white/10 md:border-t md:py-6">
            <div className="flex flex-col md:flex-row md:gap-x-2">
              <h2 className="t-heading md:hidden">Studio news</h2>
              <p className="t-heading text-grey md:hidden">Press, talks, and events</p>
              <h2 className="t-label hidden md:block">Studio news</h2>
              <p className="t-label hidden text-grey md:block">Press, talks, and events</p>
            </div>
            <a href="#" className="group hidden md:block">
              <BracketLabel>View all</BracketLabel>
            </a>
          </div>
        </div>
      </div>

      <div className="md:px-3">
        <div className="grid grid-cols-8 gap-y-0 pb-5 md:grid-cols-16 md:gap-x-3 md:pb-0">
          <div className="col-span-8 md:col-span-7">
            <Story item={feature} feature />
          </div>
          <div className="col-span-8 md:col-span-9 md:grid md:grid-cols-2 md:gap-x-3">
            {rest.map((item) => (
              <div key={item.title} className="col-span-8 md:col-span-1">
                <Story item={item} />
              </div>
            ))}
          </div>
        </div>
        <a href="#" className="group mt-2 block md:hidden">
          <BracketLabel>View all</BracketLabel>
        </a>
      </div>
    </section>
  );
}

function Story({ item, feature = false }: { item: NewsItem; feature?: boolean }) {
  return (
    <a href="#" className={`group block ${feature ? "pb-8 md:pb-0" : "flex items-center gap-x-4 border-t border-white/10 py-3 md:block md:border-0 md:py-0"}`}>
      <div className={`relative overflow-hidden rounded-sm bg-off-black ${feature ? "aspect-video" : "aspect-[3/2] w-[60px] shrink-0 md:aspect-video md:w-auto"}`}>
        <Media variant={item.media} />
      </div>
      <div className={feature ? "pt-3 md:pt-[14px]" : "md:pt-[14px]"}>
        <h3 className="t-body text-white">{item.title}</h3>
        {item.excerpt && <p className="t-body line-clamp-2 pt-[6px] text-grey md:max-w-[96%]">{item.excerpt}</p>}
        <div className={`items-center gap-x-3 pt-3 ${feature ? "flex" : "hidden md:flex"}`}>
          <span className="t-chip rounded-xs bg-darkest-grey px-[6px] py-[5px] text-white">{item.tag}</span>
          <span className="t-label text-grey normal-case">{item.date}</span>
        </div>
      </div>
    </a>
  );
}
