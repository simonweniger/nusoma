"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import { db } from "@/lib/db";

interface DatabaseContextType {
  db: typeof db;
  data: any;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined,
);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { sessionId } = useAuth();
  const { user } = useAuth();

  const { data } = db.useQuery(
    {
      conversations: {
        $: {
          where: {
            or: [
              {
                "user.id": user ? user.id : undefined,
              },
              {
                sessionId: sessionId ?? "",
              },
            ],
          },
        },
        messages: {},
      },
      personas: {
        $: {
          where: {
            "user.id": user ? user.id : undefined,
          },
        },
      },
    },
    {
      ruleParams: {
        sessionId: sessionId ?? "",
      },
    },
  );

  return (
    <DatabaseContext.Provider value={{ db, data }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
}
