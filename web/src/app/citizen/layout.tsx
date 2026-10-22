import React from 'react';
import CitizenNavbar from '@/components/citizen/CitizenNavbar';

export const metadata = {
  title: 'Citizen Portal - EzLex',
  description: 'Access legal rights, track cases, and draft legal documents easily.',
};

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <CitizenNavbar />
      <div className="pt-16">
        {children}
      </div>
    </div>
  );
}
