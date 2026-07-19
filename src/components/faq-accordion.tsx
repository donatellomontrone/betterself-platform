"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

type Faq = readonly [question: string, answer: string];

export function FaqAccordion({ items }: { items: readonly Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const id = useId();

  return (
    <div className="faq-accordion" data-reveal>
      {items.map(([question, answer], index) => {
        const isOpen = index === openIndex;
        const panelId = `${id}-${index}`;

        return (
          <article key={question} className={`faq-item${isOpen ? " is-open" : ""}`}>
            <h2>
              <button
                type="button"
                className="faq-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span>{question}</span>
                <ChevronDown className="faq-chevron" aria-hidden="true" />
              </button>
            </h2>
            <div id={panelId} className="faq-panel" aria-hidden={!isOpen}>
              <div>
                <p>{answer}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
