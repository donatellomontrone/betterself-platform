"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { track } from "@vercel/analytics";

type EventData = Record<string, string | number | boolean | null | undefined>;

export function trackBetterSelfEvent(name: string, data?: EventData) {
  track(name, data);
}

type TrackedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    eventName: string;
    eventData?: EventData;
  };

export function TrackedLink({
  eventName,
  eventData,
  onClick,
  ...props
}: TrackedLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    trackBetterSelfEvent(eventName, eventData);
    onClick?.(event);
  }

  return <Link {...props} onClick={handleClick} />;
}

type TrackedExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: string;
  eventData?: EventData;
};

export function TrackedExternalLink({
  eventName,
  eventData,
  onClick,
  ...props
}: TrackedExternalLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    trackBetterSelfEvent(eventName, eventData);
    onClick?.(event);
  }

  return <a {...props} onClick={handleClick} />;
}
