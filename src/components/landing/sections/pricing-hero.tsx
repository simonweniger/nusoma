"use client";

import * as React from "react";

import { APP_NAME } from "@/lib/common";

import { GridSection } from "../fragments/grid-section";
import { SiteHeading } from "../fragments/site-heading";

export function PricingHero(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container space-y-12 py-20">
        <SiteHeading
          badge="Pricing"
          title="Plans for your business"
          description={`From early-stage startups to growing enterprises, ${APP_NAME} has you covered.`}
        />
        {/* <PricingTable /> */}
      </div>
    </GridSection>
  );
}
