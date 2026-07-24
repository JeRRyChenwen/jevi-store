import Link from "next/link";

type Props = {
  slug: string;
};

export default function CategoryBuyingGuide({ slug }: Props) {
  if (slug !== "shoes") return null;

  return (
    <section
      aria-labelledby="category-buying-guide"
      className="mx-auto mt-12 max-w-6xl border-t border-neutral-200 pt-10"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
          Buying Guide
        </p>

        <h2
          id="category-buying-guide"
          className="mt-3 font-serif text-2xl font-normal tracking-wide text-neutral-900 md:text-3xl"
        >
          Choosing Height-Increasing Shoes
        </h2>

        <p className="mt-4 leading-7 text-neutral-600">
          Height-increasing shoes combine a discreet internal lift with the
          structure of an everyday shoe. The added height is incorporated into
          the design, helping the shoe maintain a natural appearance when worn.
          Different styles offer different levels of elevation, support and
          formality, so the best choice depends on how and where you plan to
          wear them.
        </p>
      </div>

      <div className="mt-9 grid gap-8 md:grid-cols-2">
        <article>
          <h3 className="text-lg font-semibold text-neutral-900">
            How do elevator shoes add height?
          </h3>

          <p className="mt-3 leading-7 text-neutral-600">
            Elevator shoes use a raised internal section together with a
            supportive outsole. Because the elevation is built into the shoe, it
            is less noticeable than placing a separate lift inside a standard
            shoe. The trousers and overall shoe profile also help create a
            balanced, natural-looking silhouette.
          </p>
        </article>

        <article>
          <h3 className="text-lg font-semibold text-neutral-900">
            How much added height should you choose?
          </h3>

          <p className="mt-3 leading-7 text-neutral-600">
            For regular daily use, a moderate increase is often the easiest
            place to start. Consider your experience with elevated footwear, the
            length of time you expect to wear the shoes and the occasion. A
            lower, gradual lift may feel more familiar, while a higher option
            can provide a more noticeable increase.
          </p>
        </article>

        <article>
          <h3 className="text-lg font-semibold text-neutral-900">
            Comfort and fit
          </h3>

          <p className="mt-3 leading-7 text-neutral-600">
            Correct sizing is especially important in height-increasing shoes.
            Your heel should feel secure and your toes should have sufficient
            room without sliding forward. Wear them for shorter periods at first
            and allow time to become accustomed to the elevated position.
            Suitable socks and the correct fastening can also improve comfort.
          </p>
        </article>

        <article>
          <h3 className="text-lg font-semibold text-neutral-900">
            Choosing a style for the occasion
          </h3>

          <p className="mt-3 leading-7 text-neutral-600">
            Sneakers and casual styles work well for everyday outfits, weekends
            and relaxed workplaces. Leather shoes and boots are more suitable
            for business wear, dinners, weddings and formal events. Consider
            colour, material and trouser length when coordinating the shoes with
            your wardrobe.
          </p>
        </article>
      </div>

      <div className="mt-10 rounded-2xl bg-neutral-50 px-6 py-6 md:px-8">
        <h3 className="text-lg font-semibold text-neutral-900">
          Explore the right style
        </h3>

        <p className="mt-2 leading-7 text-neutral-600">
          Compare everyday sneakers with polished formal options, or check our
          sizing information before placing your order.
        </p>

        <nav
          aria-label="Related shopping guides"
          className="mt-5 flex flex-wrap gap-x-6 gap-y-3"
        >
          <Link
            href="/category/casual-shoes"
            className="font-medium text-neutral-900 underline underline-offset-4"
          >
            Casual height-increasing shoes
          </Link>

          <Link
            href="/category/formal-shoes"
            className="font-medium text-neutral-900 underline underline-offset-4"
          >
            Formal height-increasing shoes
          </Link>

          <Link
            href="/size-guide"
            className="font-medium text-neutral-900 underline underline-offset-4"
          >
            View the size guide
          </Link>

          <Link
            href="/shipping-policy"
            className="font-medium text-neutral-900 underline underline-offset-4"
          >
            Australian shipping information
          </Link>
        </nav>
      </div>
    </section>
  );
}
