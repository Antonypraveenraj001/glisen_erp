import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PurchaseBillUpload from "../../components/purchaseBill/PurchaseBillUpload";
import { extractPurchaseBill } from "../../services/purchaseBillService";

export default function PurchaseBillScanner() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExtract = async () => {
    if (!selectedFile) {
      setError("Please select a purchase bill image first.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await extractPurchaseBill(selectedFile);

      sessionStorage.setItem(
        "purchase_bill_draft",
        JSON.stringify(response)
      );

      navigate("/purchase-bills/review");
    } catch (err) {
      console.error("Purchase bill extraction error:", err);

      setError(
        "Unable to process the purchase bill. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    setError("");

    navigate("/purchase-bills/review?mode=manual");
  };

  return (
    <div className="purchase-bill-scanner">
      {/* PAGE HEADER */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        <div>
          <h1>Purchase Bill Scanner</h1>

          <p>
            Upload a supplier bill and let AI extract the purchase
            information for review.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/purchase-bills")}
          disabled={loading}
        >
          Back to Purchase Bills
        </button>
      </div>

      {/* MAIN CARD */}
      <div
        className="scanner-card"
        style={{
          background: "#ffffff",
          borderRadius: "10px",
          padding: "25px",
        }}
      >
        {/* HEADER */}
        <div
          className="scanner-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "25px",
          }}
        >
          <div>
            <h2>Purchase Bill Entry</h2>

            <p>
              Choose how you want to enter the purchase bill.
            </p>
          </div>

          <div
            className="ai-badge"
            style={{
              background: "#e0f2fe",
              color: "#0369a1",
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            AI Assisted
          </div>
        </div>

        {/* TWO OPTIONS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "25px",
            marginBottom: "30px",
          }}
        >
          {/* AI OPTION */}
          <div
            style={{
              border: "1px solid #dbeafe",
              borderRadius: "10px",
              padding: "25px",
              background: "#f8fbff",
            }}
          >
            <h3>Option 1 — AI Extraction</h3>

            <p
              style={{
                color: "#6b7280",
                lineHeight: 1.6,
              }}
            >
              Upload a purchase bill image or PDF. AI will extract
              supplier, bill and product information automatically.
              You can review and edit everything before confirmation.
            </p>

            <div
              style={{
                marginTop: "20px",
              }}
            >
              <PurchaseBillUpload
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                loading={loading}
                onUpload={handleExtract}
              />
            </div>

            {selectedFile && (
              <div
                className="selected-file"
                style={{
                  marginTop: "15px",
                  padding: "12px",
                  background: "#f3f4f6",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div>
                  <strong>Selected File</strong>

                  <div>{selectedFile.name}</div>
                </div>

                <span>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>

          {/* MANUAL OPTION */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "25px",
              background: "#ffffff",
            }}
          >
            <h3>Option 2 — Manual Entry</h3>

            <p
              style={{
                color: "#6b7280",
                lineHeight: 1.6,
              }}
            >
              Enter the purchase bill details yourself. This is useful
              when the bill image is unclear, unavailable, or when you
              simply want to enter the information manually.
            </p>

            <div
              style={{
                marginTop: "25px",
                padding: "20px",
                background: "#f9fafb",
                borderRadius: "8px",
              }}
            >
              <h4>Enter Purchase Bill Details Manually</h4>

              <p
                style={{
                  color: "#6b7280",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                You will be taken to the same review screen used by
                AI extraction, where you can enter supplier, bill and
                product details.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={handleManualEntry}
                disabled={loading}
                style={{
                  marginTop: "15px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "12px 18px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Enter Purchase Bill Details Manually
              </button>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div
            className="error-message"
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* CANCEL */}
        <div
          className="scanner-actions"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "20px",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/purchase-bills")}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* NOTE */}
      <div
        className="scanner-note"
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "#eff6ff",
          borderRadius: "8px",
          color: "#1e40af",
        }}
      >
        <strong>Important:</strong> Whether you use AI extraction or
        manual entry, the purchase bill must be reviewed before it is
        confirmed and saved.
      </div>
    </div>
  );
}