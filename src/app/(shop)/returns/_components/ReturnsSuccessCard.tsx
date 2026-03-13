"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ReturnsSuccessCardProps = {
  submitResult: any;
  uploadResult: any;
  onStartAnotherReturn: () => void;
};

export default function ReturnsSuccessCard({
  submitResult,
  uploadResult,
  onStartAnotherReturn,
}: ReturnsSuccessCardProps) {
  return (
    <Card className="p-4 space-y-3 mt-4">
      <h2 className="text-lg font-semibold">Return request submitted 🎉</h2>
      <p className="text-sm text-muted-foreground">
        We&apos;ve received your return request. You&apos;ll receive an email once it&apos;s reviewed.
      </p>

      <div className="text-sm">
        <div>
          Return ID:{" "}
          <span className="font-mono">
            {submitResult.return?.return_number ?? submitResult.return?.id}
          </span>
        </div>
        <div>
          Status: <span>{submitResult.return?.status || "pending"}</span>
        </div>
        <div>Created at: {submitResult.return?.created_at_cn || "N/A"}</div>
      </div>

      {uploadResult?.ok && (
        <div className="text-xs text-muted-foreground">
          Uploaded images: {uploadResult.count || 0}
        </div>
      )}

      <Button
        variant="outline"
        className="px-6"
        onClick={onStartAnotherReturn}
      >
        Start another return
      </Button>
    </Card>
  );
}