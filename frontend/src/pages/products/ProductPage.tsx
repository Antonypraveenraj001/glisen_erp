import {
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import {
    Box,
    Edit3,
    Loader2,
    PackagePlus,
    Search,
    ShieldCheck,
    TriangleAlert,
    X,
  } from "lucide-react";
  
  import "./ProductPage.css";
  
  import {
    createProduct,
    deactivateProduct,
    getProducts,
    updateProduct,
  } from "../../services/productService";
  
  import type {
    Product,
    ProductCreatePayload,
  } from "../../types/product";
  
  
  const EMPTY_FORM: ProductCreatePayload = {
    product_code: "",
    product_name: "",
    description: null,
    category: "",
    unit: "",
    hsn_code: "",
    gst_percentage: 0,
    purchase_price: 0,
    selling_price: 0,
    minimum_stock: 0,
    maximum_stock: 0,
    current_stock: 0,
    is_active: true,
  };
  
  
  function formatCurrency(
    value: string | number
  ) {
    const numeric =
      typeof value === "number"
        ? value
        : Number(value);
  
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }
    ).format(numeric || 0);
  }
  
  
  function getStockStatus(
    product: Product
  ) {
    const current =
      Number(product.current_stock);
  
    const minimum =
      Number(product.minimum_stock);
  
    const maximum =
      Number(product.maximum_stock);
  
    if (!product.is_active) {
      return {
        label: "Inactive",
        className: "inactive",
      };
    }
  
    if (
      minimum > 0 &&
      current <= minimum
    ) {
      return {
        label: "Low Stock",
        className: "low",
      };
    }
  
    if (
      maximum > 0 &&
      current > maximum
    ) {
      return {
        label: "Over Stock",
        className: "over",
      };
    }
  
    return {
      label: "In Stock",
      className: "good",
    };
  }
  
  
  export default function ProductPage() {
    const [products, setProducts] =
      useState<Product[]>([]);
  
    const [search, setSearch] =
      useState("");
  
    const [loading, setLoading] =
      useState(true);
  
    const [saving, setSaving] =
      useState(false);
  
    const [error, setError] =
      useState<string | null>(null);
  
    const [showForm, setShowForm] =
      useState(false);
  
    const [editingProduct, setEditingProduct] =
      useState<Product | null>(null);
  
    const [form, setForm] =
      useState<ProductCreatePayload>(
        EMPTY_FORM
      );
  
  
    async function loadProducts(
      query = ""
    ) {
      try {
        setLoading(true);
        setError(null);
  
        const data =
          await getProducts(query);
  
        setProducts(data);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to load products."
        );
      } finally {
        setLoading(false);
      }
    }
  
  
    useEffect(() => {
      void loadProducts();
    }, []);
  
  
    const activeCount =
      useMemo(
        () =>
          products.filter(
            (product) =>
              product.is_active
          ).length,
        [products]
      );
  
  
    const lowStockCount =
      useMemo(
        () =>
          products.filter(
            (product) =>
              product.is_active &&
              Number(
                product.minimum_stock
              ) > 0 &&
              Number(
                product.current_stock
              ) <=
                Number(
                  product.minimum_stock
                )
          ).length,
        [products]
      );
  
  
    function openCreateForm() {
      setEditingProduct(null);
      setForm(EMPTY_FORM);
      setShowForm(true);
    }
  
  
    function openEditForm(
      product: Product
    ) {
      setEditingProduct(product);
  
      setForm({
        product_code:
          product.product_code,
  
        product_name:
          product.product_name,
  
        description:
          product.description,
  
        category:
          product.category,
  
        unit:
          product.unit,
  
        hsn_code:
          product.hsn_code,
  
        gst_percentage:
          Number(
            product.gst_percentage
          ),
  
        purchase_price:
          Number(
            product.purchase_price
          ),
  
        selling_price:
          Number(
            product.selling_price
          ),
  
        minimum_stock:
          Number(
            product.minimum_stock
          ),
  
        maximum_stock:
          Number(
            product.maximum_stock
          ),
  
        current_stock:
          Number(
            product.current_stock
          ),
  
        is_active:
          product.is_active,
      });
  
      setShowForm(true);
    }
  
  
    function closeForm() {
      setShowForm(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    }
  
  
    function updateField(
      field: keyof ProductCreatePayload,
      value: string | number | boolean | null
    ) {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    }
  
  
    async function handleSubmit(
      event: React.FormEvent
    ) {
      event.preventDefault();
  
      try {
        setSaving(true);
        setError(null);
  
        if (editingProduct) {
          await updateProduct(
            editingProduct.id,
            form
          );
        } else {
          await createProduct(form);
        }
  
        closeForm();
  
        await loadProducts(search);
      } catch (err) {
        console.error(err);
  
        setError(
          editingProduct
            ? "Unable to update product."
            : "Unable to create product."
        );
      } finally {
        setSaving(false);
      }
    }
  
  
    async function handleDeactivate(
      product: Product
    ) {
      const confirmed =
        window.confirm(
          `Deactivate ${product.product_name}?`
        );
  
      if (!confirmed) {
        return;
      }
  
      try {
        setError(null);
  
        await deactivateProduct(
          product.id
        );
  
        await loadProducts(search);
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to deactivate product."
        );
      }
    }
  
  
    async function handleSearch(
      event: React.FormEvent
    ) {
      event.preventDefault();
  
      await loadProducts(search);
    }
  
  
    async function handleClearSearch() {
      setSearch("");
  
      await loadProducts("");
    }
  
  
    return (
      <div className="product-page">
  
        <div className="product-page-header">
          <div>
            <div className="product-eyebrow">
              PRODUCT & INVENTORY MASTER
            </div>
  
            <h1 className="product-title">
              Products
            </h1>
  
            <p className="product-subtitle">
              Manage product information,
              pricing, GST details and
              stock thresholds.
            </p>
          </div>
  
          <button
            type="button"
            className="product-primary-button"
            onClick={openCreateForm}
          >
            <PackagePlus size={17} />
  
            Add Product
          </button>
        </div>
  
  
        {error && (
          <div className="product-error">
            {error}
          </div>
        )}
  
  
        <div className="product-kpi-grid">
  
          <div className="product-kpi-card">
            <div>
              <div className="product-kpi-label">
                Total Products
              </div>
  
              <div className="product-kpi-value">
                {products.length}
              </div>
            </div>
  
            <div className="product-kpi-icon blue">
              <Box size={20} />
            </div>
          </div>
  
  
          <div className="product-kpi-card">
            <div>
              <div className="product-kpi-label">
                Active Products
              </div>
  
              <div className="product-kpi-value">
                {activeCount}
              </div>
            </div>
  
            <div className="product-kpi-icon green">
              <ShieldCheck size={20} />
            </div>
          </div>
  
  
          <div className="product-kpi-card">
            <div>
              <div className="product-kpi-label">
                Low Stock
              </div>
  
              <div className="product-kpi-value">
                {lowStockCount}
              </div>
            </div>
  
            <div className="product-kpi-icon amber">
              <TriangleAlert size={20} />
            </div>
          </div>
  
        </div>
  
  
        <div className="product-toolbar">
  
          <form
            className="product-search"
            onSubmit={handleSearch}
          >
            <Search size={17} />
  
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search code, name, category or HSN..."
            />
  
            {search && (
              <button
                type="button"
                className="product-search-clear"
                onClick={
                  handleClearSearch
                }
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
  
            <button
              type="submit"
              className="product-secondary-button"
            >
              Search
            </button>
          </form>
  
        </div>
  
  
        <div className="product-panel">
  
          <div className="product-panel-header">
            <div>
              <div className="product-panel-title">
                Product Master
              </div>
  
              <div className="product-panel-subtitle">
                Current products available
                in the ERP.
              </div>
            </div>
  
            <div className="product-panel-badge">
              {products.length} records
            </div>
          </div>
  
  
          {loading ? (
            <div className="product-loading-state">
              <Loader2
                size={23}
                className="product-spin"
              />
  
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="product-empty-state">
              <Box size={25} />
  
              <div>
                No products found.
              </div>
            </div>
          ) : (
            <div className="product-table-wrap">
  
              <table className="product-table">
  
                <thead>
                  <tr>
                    <th>
                      Product
                    </th>
  
                    <th>
                      Category
                    </th>
  
                    <th>
                      HSN
                    </th>
  
                    <th>
                      Unit
                    </th>
  
                    <th className="align-right">
                      Purchase
                    </th>
  
                    <th className="align-right">
                      Selling
                    </th>
  
                    <th className="align-right">
                      GST
                    </th>
  
                    <th className="align-right">
                      Stock
                    </th>
  
                    <th>
                      Status
                    </th>
  
                    <th className="align-right">
                      Actions
                    </th>
                  </tr>
                </thead>
  
  
                <tbody>
                  {products.map(
                    (product) => {
                      const status =
                        getStockStatus(
                          product
                        );
  
                      return (
                        <tr key={product.id}>
  
                          <td>
                            <div className="product-name">
                              {
                                product.product_name
                              }
                            </div>
  
                            <div className="product-code">
                              {
                                product.product_code
                              }
                            </div>
                          </td>
  
  
                          <td>
                            {product.category}
                          </td>
  
  
                          <td>
                            {product.hsn_code}
                          </td>
  
  
                          <td>
                            {product.unit}
                          </td>
  
  
                          <td className="align-right product-money">
                            {formatCurrency(
                              product.purchase_price
                            )}
                          </td>
  
  
                          <td className="align-right product-money">
                            {formatCurrency(
                              product.selling_price
                            )}
                          </td>
  
  
                          <td className="align-right">
                            {
                              Number(
                                product.gst_percentage
                              )
                            }
                            %
                          </td>
  
  
                          <td className="align-right product-stock-value">
                            {
                              Number(
                                product.current_stock
                              )
                            }{" "}
                            {product.unit}
                          </td>
  
  
                          <td>
                            <span
                              className={
                                `product-status ${status.className}`
                              }
                            >
                              {
                                status.label
                              }
                            </span>
                          </td>
  
  
                          <td className="align-right">
                            <div className="product-actions">
  
                              <button
                                type="button"
                                className="product-icon-button"
                                onClick={() =>
                                  openEditForm(
                                    product
                                  )
                                }
                                title="Edit product"
                              >
                                <Edit3 size={15} />
                              </button>
  
  
                              {product.is_active && (
                                <button
                                  type="button"
                                  className="product-deactivate-button"
                                  onClick={() =>
                                    handleDeactivate(
                                      product
                                    )
                                  }
                                >
                                  Deactivate
                                </button>
                              )}
  
                            </div>
                          </td>
  
                        </tr>
                      );
                    }
                  )}
                </tbody>
  
              </table>
            </div>
          )}
  
        </div>
  
  
        {showForm && (
          <div className="product-modal-backdrop">
  
            <div className="product-modal">
  
              <div className="product-modal-header">
                <div>
                  <div className="product-modal-title">
                    {editingProduct
                      ? "Edit Product"
                      : "Add Product"}
                  </div>
  
                  <div className="product-modal-subtitle">
                    Enter product master
                    information.
                  </div>
                </div>
  
                <button
                  type="button"
                  className="product-modal-close"
                  onClick={closeForm}
                >
                  <X size={18} />
                </button>
              </div>
  
  
              <form
                className="product-form"
                onSubmit={handleSubmit}
              >
  
                <div className="product-form-grid">
  
                  <label className="product-field">
                    <span>
                      Product Code *
                    </span>
  
                    <input
                      required
                      value={
                        form.product_code
                      }
                      onChange={(event) =>
                        updateField(
                          "product_code",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      Product Name *
                    </span>
  
                    <input
                      required
                      value={
                        form.product_name
                      }
                      onChange={(event) =>
                        updateField(
                          "product_name",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      Category *
                    </span>
  
                    <input
                      required
                      value={
                        form.category
                      }
                      onChange={(event) =>
                        updateField(
                          "category",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      Unit *
                    </span>
  
                    <input
                      required
                      placeholder="Nos, Kg, Mtr..."
                      value={
                        form.unit
                      }
                      onChange={(event) =>
                        updateField(
                          "unit",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      HSN Code *
                    </span>
  
                    <input
                      required
                      value={
                        form.hsn_code
                      }
                      onChange={(event) =>
                        updateField(
                          "hsn_code",
                          event.target.value
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      GST %
                    </span>
  
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.gst_percentage
                      }
                      onChange={(event) =>
                        updateField(
                          "gst_percentage",
                          Number(
                            event.target.value
                          )
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      Purchase Price
                    </span>
  
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.purchase_price
                      }
                      onChange={(event) =>
                        updateField(
                          "purchase_price",
                          Number(
                            event.target.value
                          )
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      Selling Price
                    </span>
  
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.selling_price
                      }
                      onChange={(event) =>
                        updateField(
                          "selling_price",
                          Number(
                            event.target.value
                          )
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      Minimum Stock
                    </span>
  
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.minimum_stock
                      }
                      onChange={(event) =>
                        updateField(
                          "minimum_stock",
                          Number(
                            event.target.value
                          )
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      Maximum Stock
                    </span>
  
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.maximum_stock
                      }
                      onChange={(event) =>
                        updateField(
                          "maximum_stock",
                          Number(
                            event.target.value
                          )
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-field">
                    <span>
                      Current Stock
                    </span>
  
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.current_stock
                      }
                      onChange={(event) =>
                        updateField(
                          "current_stock",
                          Number(
                            event.target.value
                          )
                        )
                      }
                    />
                  </label>
  
  
                  <label className="product-checkbox-field">
                    <input
                      type="checkbox"
                      checked={
                        form.is_active
                      }
                      onChange={(event) =>
                        updateField(
                          "is_active",
                          event.target.checked
                        )
                      }
                    />
  
                    Active Product
                  </label>
  
                </div>
  
  
                <label className="product-field product-field-full">
                  <span>
                    Description
                  </span>
  
                  <textarea
                    rows={3}
                    value={
                      form.description ?? ""
                    }
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value ||
                          null
                      )
                    }
                  />
                </label>
  
  
                <div className="product-form-actions">
  
                  <button
                    type="button"
                    className="product-ghost-button"
                    onClick={closeForm}
                  >
                    Cancel
                  </button>
  
  
                  <button
                    type="submit"
                    className="product-primary-button"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2
                        size={16}
                        className="product-spin"
                      />
                    ) : (
                      <PackagePlus
                        size={16}
                      />
                    )}
  
                    {editingProduct
                      ? "Save Changes"
                      : "Create Product"}
                  </button>
  
                </div>
  
              </form>
  
            </div>
          </div>
        )}
  
      </div>
    );
  }