// src/app/(shop)/returns/page.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { UserTime } from "@/components/datetime/Time";
import BackButton from "@/components/navigation/BackButton";

import ReturnItemsSelector from "./_components/ReturnItemsSelector";
import ReturnsLookupStep from "./_components/ReturnsLookupStep";
import ReturnsSuccessCard from "./_components/ReturnsSuccessCard";
import ReturnsSubmissionCard from "./_components/ReturnsSubmissionCard";

import { useReturnsPageFlow } from "./(hooks)/useReturnsPageFlow";

export default function ReturnsPage() {
  const {
    step,

    orderNumber,
    setOrderNumber,
    email,
    setEmail,

    authed,
    bootLoading,
    bootError,
    sortKey,
    sortDir,
    ordersPage,
    sortedMyOrders,
    pagedOrders,
    ordersTotal,
    ordersTotalPages,
    shouldLockListHeight,
    showingFrom,
    showingTo,
    goPage,
    toggleSort,

    loading,
    lookupCooldownLeftSec,
    isLookupCoolingDown,

    order,
    foundOrder,
    thumbByItemId,
    setSelectedLines,

    reasonType,
    setReasonType,
    reasonDetail,
    setReasonDetail,

    submitting,
    submitResult,

    alert,
    hasAlert,

    images,
    uploading,
    uploadResult,
    onPickImages,
    removeImage,

    showInlineBlock,
    inlineTitle,
    inlineVariant,
    inlineMessage,

    handleFindOrder,
    handleSubmitReturn,
    handleStartAnotherReturn,
  } = useReturnsPageFlow();

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-4">
        <BackButton
          label="Back"
          forceHref="/"
          variant="chip"
        />
      </div>

      <h1 className="text-2xl font-semibold mb-2">Returns &amp; Exchanges</h1>

      <p className="text-sm text-muted-foreground mb-4">
        For information about return eligibility, refunds, exchanges, and your consumer rights,
        please see our{" "}
        <a href="/returns-policy" className="font-semibold underline">
          Returns Policy
        </a>
        .
      </p>

      {step === 1 && isLookupCoolingDown && !showInlineBlock && (
        <div className="mb-4">
          <Alert variant="error">
            {`Too many attempts. Please wait ${lookupCooldownLeftSec} ${
              lookupCooldownLeftSec === 1 ? "second" : "seconds"
            } and try again.`}
          </Alert>
        </div>
      )}

      {hasAlert && !showInlineBlock && !isLookupCoolingDown && alert?.message && (
        <div className="mb-4">
          <Alert variant={alert.type}>{alert.message}</Alert>
        </div>
      )}

      {step === 1 && (
        <ReturnsLookupStep
          bootLoading={bootLoading}
          authed={authed}
          bootError={bootError}
          sortedMyOrdersLength={sortedMyOrders.length}
          pagedOrders={pagedOrders}
          shouldLockListHeight={shouldLockListHeight}
          ordersTotal={ordersTotal}
          showingFrom={showingFrom}
          showingTo={showingTo}
          ordersPage={ordersPage}
          ordersTotalPages={ordersTotalPages}
          sortKey={sortKey}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          orderNumber={orderNumber}
          email={email}
          onOrderNumberChange={setOrderNumber}
          onEmailChange={setEmail}
          loading={loading}
          isLookupCoolingDown={isLookupCoolingDown}
          onGoPage={goPage}
          onFindOrder={handleFindOrder}
        />
      )}

      {step === 2 && order && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-medium">Order {order.order_number ?? order.id}</div>
                <div className="text-muted-foreground">
                  Placed at:{" "}
                  {"created_at_ts" in (order as any) &&
                  typeof (order as any).created_at_ts === "number" ? (
                    <UserTime ts={(order as any).created_at_ts} fallback="N/A" />
                  ) : (
                    order.created_at_cn || "N/A"
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                Status: {order.status}
              </div>
            </div>
          </Card>

          {foundOrder && (
            <ReturnItemsSelector
              order={foundOrder}
              onSelectionChange={setSelectedLines}
              thumbByItemId={thumbByItemId}
            />
          )}

          <ReturnsSubmissionCard
            images={images}
            submitting={submitting}
            uploading={uploading}
            uploadResult={uploadResult}
            reasonType={reasonType}
            reasonDetail={reasonDetail}
            onPickImages={onPickImages}
            onRemoveImage={removeImage}
            onReasonTypeChange={setReasonType}
            onReasonDetailChange={setReasonDetail}
            onSubmit={handleSubmitReturn}
            showInlineBlock={showInlineBlock}
            inlineTitle={inlineTitle}
            inlineVariant={inlineVariant}
            inlineMessage={inlineMessage}
          />
        </div>
      )}

      {step === 3 && submitResult && (
        <ReturnsSuccessCard
          submitResult={submitResult}
          uploadResult={uploadResult}
          onStartAnotherReturn={handleStartAnotherReturn}
        />
      )}
    </div>
  );
}