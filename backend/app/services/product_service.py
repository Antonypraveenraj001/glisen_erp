from sqlalchemy.orm import Session

from app.models.product import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
)


class ProductService:

    @staticmethod
    def create(
        db: Session,
        product: ProductCreate,
    ):

        db_product = Product(
            product_code=product.product_code,
            product_name=product.product_name,
            description=product.description,
            category=product.category,
            unit=product.unit,
            hsn_code=product.hsn_code,
            gst_percentage=product.gst_percentage,
            purchase_price=product.purchase_price,
            selling_price=product.selling_price,
            minimum_stock=product.minimum_stock,
            maximum_stock=product.maximum_stock,
            current_stock=product.current_stock,
            is_active=product.is_active,
        )

        return ProductRepository.create(
            db,
            db_product,
        )

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
    ):
        return ProductRepository.get_all(
            db,
            search,
        )

    @staticmethod
    def get_by_id(
        db: Session,
        product_id: int,
    ):
        return ProductRepository.get_by_id(
            db,
            product_id,
        )

    @staticmethod
    def update(
        db: Session,
        product_id: int,
        product_data: ProductUpdate,
    ):

        product = ProductRepository.get_by_id(
            db,
            product_id,
        )

        if product is None:
            return None

        product.product_code = product_data.product_code
        product.product_name = product_data.product_name
        product.description = product_data.description
        product.category = product_data.category
        product.unit = product_data.unit
        product.hsn_code = product_data.hsn_code
        product.gst_percentage = product_data.gst_percentage
        product.purchase_price = product_data.purchase_price
        product.selling_price = product_data.selling_price
        product.minimum_stock = product_data.minimum_stock
        product.maximum_stock = product_data.maximum_stock
        product.current_stock = product_data.current_stock
        product.is_active = product_data.is_active

        return ProductRepository.update(
            db,
            product,
        )

    @staticmethod
    def deactivate(
        db: Session,
        product_id: int,
    ):

        product = ProductRepository.get_by_id(
            db,
            product_id,
        )

        if product is None:
            return None

        return ProductRepository.deactivate(
            db,
            product,
        )