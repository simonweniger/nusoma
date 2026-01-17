import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useState } from "react";
import { CreditCardIcon, DiamondsFourIcon } from "@phosphor-icons/react";
import NumberFlow from "@number-flow/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";

export default function PlansDialog() {
  const { db, user } = useAuth();
  const [sliderValue, setSliderValue] = useState(10); // Default to $10

  const url = db.auth.createAuthorizationURL({
    clientName: "google-web",
    redirectURL: window.location.href,
  });

  const credits = sliderValue * 1000;

  return (
    <Dialog>
      <DialogTrigger
        render={(props) => (
          <Button size="sm" variant="outline" {...props}>
            <CreditCardIcon
              size={8}
              className="text-sage-12 group-hover:text-sage-12 transition-colors duration-300"
            />
            Add Credits
          </Button>
        )}
      ></DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-gray-12 font-medium text-md">
            Purchase Credits
          </DialogTitle>
          <DialogDescription className="text-gray-11 text-sm">
            Select an amount for a one-time credit purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center w-full gap-4 border border-border rounded-lg p-6">
          <div className="w-full flex justify-between items-center mb-4">
            <span className="text-gray-12 font-medium text-lg">
              <NumberFlow value={sliderValue} prefix="$" />
            </span>

            <p className="text-gray-10 text-[11px] max-w-xs text-right">
              nusoma is fully open source so you can also use it for free by
              hosting it yourself.{" "}
              <a
                href="https://github.com/simonweniger/nusoma"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-12 hover:underline transition-all duration-300"
              >
                View on GitHub
              </a>
            </p>
          </div>

          <Slider
            min={5}
            max={100}
            value={[sliderValue]}
            onValueChange={(value) =>
              setSliderValue(Array.isArray(value) ? value[0] : value)
            }
            className="w-full"
          >
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-11 text-md flex flex-row items-center gap-1">
                <DiamondsFourIcon
                  size={16}
                  weight="fill"
                  className="text-teal-8 group-hover:text-gray-12 transition-colors duration-300"
                />
                <NumberFlow value={credits} className="text-md text-gray-12" />
              </span>
            </div>
          </Slider>
          <div className="w-full flex justify-between text-[10px] text-gray-11">
            <span>$5 (5,000 credits)</span>
            <span>$100 (100,000 credits)</span>
          </div>

          <div className="w-full flex flex-row gap-2 justify-between items-center mt-2">
            <div className="w-max">
              {user ? (
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch(
                        "/api/stripe/create-checkout-session",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "X-Token": user?.refresh_token ?? "",
                          },
                          body: JSON.stringify({ amount: sliderValue }),
                        },
                      );
                      if (!response.ok) {
                        // Handle errors, e.g., show a notification to the user
                        console.error(
                          "Failed to create Stripe session:",
                          response.statusText,
                        );
                        // You might want to show an error mesgray to the user here
                        return;
                      }
                      const { url: checkoutUrl } = await response.json();
                      if (checkoutUrl) {
                        window.location.href = checkoutUrl;
                      } else {
                        console.error("No checkout URL returned from API");
                        // Handle missing URL, e.g., show a notification
                      }
                    } catch (error) {
                      console.error(
                        "Error during Stripe session creation:",
                        error,
                      );
                      // Handle network errors or other issues
                    }
                  }}
                  className="w-max ml-auto justify-center text-xs bg-gray-1 border border-gray-5 rounded-md px-4 py-2 text-gray-12 hover:bg-gray-3 dark:bg-gray-3 dark:border-gray-5 dark:text-gray-11 dark:hover:bg-gray-4"
                >
                  Buy Credits
                </Button>
              ) : (
                <Link href={url}>
                  <Button className="w-full justify-center text-sm bg-gray-1 border border-gray-5 rounded px-4 py-2 text-gray-12 hover:bg-gray-3 dark:bg-gray-3 dark:border-gray-5 dark:text-gray-11 dark:hover:bg-gray-4">
                    Sign Up With Google
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
