import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

type StrapiTextNode = {
  type?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  url?: string;
  children?: StrapiTextNode[];
};

type StrapiBlock = StrapiTextNode & {
  level?: number;
  format?: "ordered" | "unordered";
};

type Props = {
  description?: unknown;
  sizes?: string[];
  heights?: number[];
  categoryRootSlug?: string;
  categoryLeafSlug?: string | null;
};

function renderTextNode(node: StrapiTextNode, key: string): ReactNode {
  if (node.type === "link") {
    const external = /^https?:\/\//i.test(node.url || "");

    const content = (node.children ?? []).map((child, index) =>
      renderTextNode(child, `${key}-${index}`),
    );

    if (external) {
      return (
        <a
          key={key}
          href={node.url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-neutral-900 underline underline-offset-4"
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={key}
        href={node.url || "/"}
        className="font-medium text-neutral-900 underline underline-offset-4"
      >
        {content}
      </Link>
    );
  }

  let content: ReactNode = node.text ?? "";

  if (node.code) {
    content = (
      <code className="rounded bg-neutral-100 px-1 py-0.5 text-[0.9em]">
        {content}
      </code>
    );
  }

  if (node.bold) content = <strong>{content}</strong>;
  if (node.italic) content = <em>{content}</em>;
  if (node.underline) content = <u>{content}</u>;
  if (node.strikethrough) content = <s>{content}</s>;

  return <span key={key}>{content}</span>;
}

function renderChildren(
  children: StrapiTextNode[] | undefined,
  keyPrefix: string,
) {
  return (children ?? []).map((child, index) =>
    renderTextNode(child, `${keyPrefix}-${index}`),
  );
}

function renderBlock(block: StrapiBlock, index: number): ReactNode {
  const key = `product-description-${index}`;
  const children = renderChildren(block.children, key);

  switch (block.type) {
    case "heading": {
      if (block.level === 2) {
        return (
          <h3
            key={key}
            className="mt-6 text-base font-semibold text-neutral-900 first:mt-0"
          >
            {children}
          </h3>
        );
      }

      return (
        <h4
          key={key}
          className="mt-5 text-sm font-semibold text-neutral-900 first:mt-0"
        >
          {children}
        </h4>
      );
    }

    case "list": {
      const ListTag = block.format === "ordered" ? "ol" : "ul";

      return (
        <ListTag
          key={key}
          className={[
            "my-4 space-y-2 pl-5 text-sm leading-6 text-neutral-600",
            block.format === "ordered" ? "list-decimal" : "list-disc",
          ].join(" ")}
        >
          {(block.children ?? []).map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>
              {renderChildren(item.children, `${key}-${itemIndex}`)}
            </li>
          ))}
        </ListTag>
      );
    }

    case "quote":
      return (
        <blockquote
          key={key}
          className="my-4 border-l-2 border-neutral-300 pl-4 text-sm italic leading-6 text-neutral-600"
        >
          {children}
        </blockquote>
      );

    case "paragraph":
    default:
      return (
        <p
          key={key}
          className="my-3 text-sm leading-6 text-neutral-600 first:mt-0 last:mb-0"
        >
          {children}
        </p>
      );
  }
}

function ProductAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-neutral-200 first:border-t"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
        <span>{title}</span>

        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>

      <div className="pb-5">{children}</div>
    </details>
  );
}

export default function ProductDetails({
  description,
  sizes = [],
  heights = [],
  categoryRootSlug,
  categoryLeafSlug,
}: Props) {
  const blocks = Array.isArray(description)
    ? (description as StrapiBlock[])
    : [];

  const cleanSizes = Array.from(
    new Set(sizes.map((size) => String(size).trim()).filter(Boolean)),
  ).sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
    }),
  );

  const cleanHeights = Array.from(
    new Set(
      heights
        .map(Number)
        .filter((height) => Number.isFinite(height) && height > 0),
    ),
  ).sort((a, b) => a - b);

  const relatedCategorySlug = categoryLeafSlug || categoryRootSlug || "shoes";

  return (
    <section aria-label="Product information" className="mt-8">
      <ProductAccordion title="Product details" defaultOpen>
        {blocks.length > 0 ? (
          <div>{blocks.map(renderBlock)}</div>
        ) : (
          <p className="text-sm leading-6 text-neutral-600">
            Product information will be available soon.
          </p>
        )}
      </ProductAccordion>

      <ProductAccordion title="Size & fit">
        <div className="space-y-4 text-sm leading-6 text-neutral-600">
          {cleanHeights.length > 0 && (
            <div>
              <p className="font-medium text-neutral-900">Height increase</p>

              <p className="mt-1">
                Available in{" "}
                {cleanHeights.map((height) => `${height} cm`).join(" and ")}{" "}
                options.
              </p>
            </div>
          )}

          {cleanSizes.length > 0 && (
            <div>
              <p className="font-medium text-neutral-900">Available sizes</p>

              <p className="mt-1">{cleanSizes.join(", ")}</p>
            </div>
          )}

          <p>
            Choose your usual size unless the individual product description
            recommends otherwise. If you are new to elevated footwear, allow
            time to become accustomed to the raised position.
          </p>

          <Link
            href="/size-guide"
            className="inline-flex font-medium text-neutral-900 underline underline-offset-4"
          >
            View the size guide
          </Link>
        </div>
      </ProductAccordion>

      <ProductAccordion title="Shipping & returns">
        <div className="space-y-3 text-sm leading-6 text-neutral-600">
          <p>
            Delivery is available across Australia. Delivery estimates are shown
            during checkout based on the destination and available shipping
            service.
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href="/shipping-policy"
              className="font-medium text-neutral-900 underline underline-offset-4"
            >
              Shipping information
            </Link>

            <Link
              href="/returns-policy"
              className="font-medium text-neutral-900 underline underline-offset-4"
            >
              Returns policy
            </Link>
          </div>
        </div>
      </ProductAccordion>

      <div className="pt-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
          Related collection
        </p>

        <Link
          href={`/category/${relatedCategorySlug}`}
          className="mt-2 inline-flex text-sm font-medium text-neutral-900 underline underline-offset-4"
        >
          View related add height shoes
        </Link>
      </div>
    </section>
  );
}
