// src/app/checkout/_components/AddressErrorHint.tsx
"use client";

import React from "react";

type AddressErrorHintProps = {
  children: React.ReactNode;
  className?: string;
};

const AddressErrorHint: React.FC<AddressErrorHintProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={
        "mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-600 " +
        className
      }
    >
      {children}
    </div>
  );
};

export default AddressErrorHint;
