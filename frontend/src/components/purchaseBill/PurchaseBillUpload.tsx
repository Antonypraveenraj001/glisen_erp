import React from "react";
import type { DragEvent } from "react";

interface Props {
  selectedFile: File | null;

  setSelectedFile: React.Dispatch<
    React.SetStateAction<File | null>
  >;

  loading: boolean;

  onUpload: () => void;
}

const PurchaseBillUpload = ({
  selectedFile,
  setSelectedFile,
  loading,
  onUpload,
}: Props) => {
  /*
  ==================================================
  HANDLE FILE DROP
  ==================================================
  */

  const handleDrop = (
    e: DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    if (
      e.dataTransfer.files.length > 0
    ) {
      setSelectedFile(
        e.dataTransfer.files[0]
      );
    }
  };

  /*
  ==================================================
  HANDLE FILE BROWSE
  ==================================================
  */

  const handleBrowse = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (
      e.target.files &&
      e.target.files.length > 0
    ) {
      setSelectedFile(
        e.target.files[0]
      );
    }
  };

  /*
  ==================================================
  PAGE
  ==================================================
  */

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-5">

        <div
          className="border rounded p-5 text-center"
          style={{
            borderStyle: "dashed",
            borderWidth: "2px",
          }}
          onDrop={handleDrop}
          onDragOver={(e) =>
            e.preventDefault()
          }
        >

          <h4>
            📄 Drag & Drop Purchase Bill
          </h4>

          <p className="text-muted">
            or
          </p>

          <input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            className="form-control mb-4"
            onChange={handleBrowse}
            disabled={loading}
          />

          {selectedFile && (
            <>
              <h6>
                Selected File
              </h6>

              <p>
                {selectedFile.name}
              </p>

              <button
                type="button"
                className="btn btn-outline-danger me-2"
                onClick={() =>
                  setSelectedFile(null)
                }
                disabled={loading}
              >
                Remove
              </button>
            </>
          )}

          <hr />

          <button
            type="button"
            className="btn btn-primary px-5"
            disabled={
              !selectedFile ||
              loading
            }
            onClick={onUpload}
          >
            {loading
              ? "Extracting..."
              : "Upload & Extract"}
          </button>

        </div>

      </div>
    </div>
  );
};

export default PurchaseBillUpload;