"use client";

import { useState } from "react";
import Link from "next/link";
import SignOutButton from "./sign-out-button";

export default function MobileMenu({
  name,
  role,
  links,
}: {
  name: string;
  role: string;
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button onClick={() => setOpen(!open)} className="p-2 text-slate-600" aria-label="Menu">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open ? (
            <path d="M18 6 6 18M6 6l12 12" />
          ) : (
            <>
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </>
          )}
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg z-40">
          <div className="px-4 py-3 border-b">
            <p className="font-medium text-sm">{name}</p>
            <p className="text-xs text-indigo-600">{role === "teacher" ? "Professor" : "Aluno"}</p>
          </div>
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-b last:border-b-0"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="px-4 py-3 border-t">
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
